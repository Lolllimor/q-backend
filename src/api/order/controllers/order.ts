/**
 * order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
    /**
     * Create order endpoint (idempotent)
     * POST /api/orders/create
     * Returns existing order if reference already exists
     */
    async create(ctx) {
        try {
            const { reference, amount, customerName, email, phone, artworkId } = ctx.request.body;

            console.log('🔵 CREATE ORDER ENDPOINT CALLED');
            console.log('  Reference:', reference);
            console.log('  Amount:', amount);
            console.log('  Customer:', customerName);

            // Validate required fields
            if (!reference || !amount || !customerName || !email) {
                console.log('  ❌ Missing required fields');
                return ctx.badRequest('Missing required fields: reference, amount, customerName, email');
            }

            if (amount <= 0) {
                console.log('  ❌ Invalid amount');
                return ctx.badRequest('Amount must be greater than 0');
            }

            // Use service method with idempotency
            const orderService = strapi.service('api::order.order');
            console.log('  ✓ Calling createOrderIdempotent service...');
            const { isNew, order } = await orderService.createOrderIdempotent({
                reference,
                amount,
                customerName,
                email,
                phone,
                artworkId,
            });

            console.log('  ✓ Order result:', { isNew, orderId: order.id });

            // Log transaction
            const paystackService = strapi.service('api::paystack.paystack');
            await paystackService.logTransaction(
                order.id,
                reference,
                'create',
                'success',
                { isNew, customFields: { customerName, email } }
            );

            console.log('  ✓ Transaction logged');

            const response = {
                success: true,
                message: isNew ? 'Order created successfully' : 'Order already exists',
                isNew,
                data: {
                    orderId: order.id,
                    reference: order.reference,
                    amount: order.amount,
                    status: order.status,
                    customerName: order.customerName,
                    email: order.email,
                },
            };

            console.log('  ✓ RESPONSE:', response);
            ctx.body = response;
        } catch (error: any) {
            console.error('  ❌ ERROR creating order:', error.message);
            return ctx.internalServerError(error.message);
        }
    },

    /**
     * Verify payment endpoint (idempotent)
     * POST /api/orders/verify
     * Safe to call multiple times
     */
    async verify(ctx) {
        try {
            const { orderId, reference } = ctx.request.body;
            const idempotencyKey = ctx.request.headers['idempotency-key'];

            if (!orderId || !reference) {
                return ctx.badRequest('Missing required fields: orderId, reference');
            }

            const paystackService = strapi.service('api::paystack.paystack');
            const orderService = strapi.service('api::order.order');

            // Check if already processed (idempotency)
            if (idempotencyKey) {
                const existingLog = await strapi.db
                    .query('api::transaction-log.transaction-log')
                    .findOne({
                        where: {
                            eventId: idempotencyKey,
                            status: 'success',
                        },
                    });

                if (existingLog) {
                    // Return cached successful response
                    const order = await strapi.entityService.findOne('api::order.order', orderId);
                    return ctx.send({
                        success: true,
                        message: 'Payment already verified (cached)',
                        isIdempotentReplay: true,
                        data: {
                            orderId: order.id,
                            status: order.status,
                            paid: order.paid,
                        },
                    });
                }
            }

            // Verify payment
            const result = await orderService.verifyPaymentIdempotent(orderId, reference);

            // Log successful verification
            if (result.success || result.alreadyPaid) {
                await paystackService.logTransaction(
                    orderId,
                    reference,
                    'verify',
                    'success',
                    { alreadyPaid: result.alreadyPaid }
                );
            } else {
                await paystackService.logTransaction(
                    orderId,
                    reference,
                    'verify',
                    'failed',
                    { error: result.message },
                    result.message
                );
            }

            ctx.body = {
                success: result.success || result.alreadyPaid,
                message: result.message,
                alreadyPaid: result.alreadyPaid,
                data: {
                    orderId: result.order.id,
                    status: result.order.status,
                    paid: result.order.paid,
                },
            };
        } catch (error: any) {
            console.error('Error verifying payment:', error);

            // Log failed verification
            const { orderId, reference } = ctx.request.body;
            try {
                const paystackService = strapi.service('api::paystack.paystack');
                await paystackService.logTransaction(
                    orderId,
                    reference,
                    'verify',
                    'failed',
                    {},
                    error.message
                );
            } catch (logError) {
                console.error('Failed to log transaction:', logError);
            }

            return ctx.internalServerError(error.message);
        }
    },

    /**
     * Legacy verify endpoint (kept for compatibility)
     */
    async legacyVerify(ctx) {
        const { reference } = ctx.request.body;

        if (!reference) {
            return ctx.badRequest('No reference provided');
        }

        try {
            const paystackSecret = process.env.PAYSTACK_SECRET;

            if (!paystackSecret) {
                throw new Error('PAYSTACK_SECRET is not defined in environment variables');
            }

            const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${paystackSecret}`,
                },
            });

            const data: any = await response.json();

            if (!response.ok) {
                return ctx.badRequest('Failed to verify transaction with Paystack', data);
            }

            if (data.status === true && data.data.status === 'success') {
                const orders = await strapi.entityService.findMany('api::order.order', {
                    filters: { reference: reference },
                    limit: 1,
                });

                if (orders.length === 0) {
                    return ctx.notFound('Order not found with that reference');
                }

                const order = orders[0];

                const updatedOrder = await strapi.entityService.update('api::order.order', order.id, {
                    data: {
                        paid: true,
                        status: 'paid',
                    },
                });

                return {
                    message: 'Order verified and updated',
                    order: updatedOrder,
                    paid: true,
                };
            } else {
                return ctx.badRequest('Transaction verification failed', data);
            }
        } catch (error) {
            console.error(error);
            return ctx.internalServerError('An error occurred during verification');
        }
    },

    async webhook(ctx) {
        const crypto = require('crypto');
        const secret = process.env.PAYSTACK_SECRET;

        if (!secret) {
            console.error('PAYSTACK_SECRET not set');
            return ctx.internalServerError('Configuration error');
        }

        const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(ctx.request.body)).digest('hex');

        if (hash !== ctx.request.header['x-paystack-signature']) {
            return ctx.badRequest('Invalid signature');
        }

        const event = ctx.request.body;

        if (event && event.event === 'charge.success') {
            const reference = event.data.reference;

            try {
                // Use the service method which handles:
                // 1. Order status update
                // 2. Artwork sold status
                // 3. Transaction logging (if added to service)
                const orderService = strapi.service('api::order.order');
                await orderService.updatePaymentStatusFromWebhook(reference);

                // Also log the transaction via paystack service explicitly here if the service doesn't do it
                // (Our updated service implementation didn't seem to include transaction logging, so let's keep it safe)
                // Actually, the service implementation I saw earlier ONLY updated order and artwork.
                // The transaction logging was in the Paystack controller.
                // We should add transaction logging here to be safe.

                const paystackService = strapi.service('api::paystack.paystack');
                const order = await paystackService.getOrderByReference(reference);

                if (order) {
                    await paystackService.logTransaction(
                        order.id,
                        reference,
                        'webhook',
                        'success',
                        { webhookEvent: event.event },
                        undefined,
                        event.event
                    );
                }

            } catch (err) {
                console.error('Error updating order via webhook', err);
                // Log failure
                try {
                    const paystackService = strapi.service('api::paystack.paystack');
                    await paystackService.logTransaction(
                        0,
                        reference,
                        'webhook',
                        'failed',
                        { webhookEvent: event.event },
                        err.message,
                        event.event
                    );
                } catch (logError) {
                    console.error('Failed to log webhook error:', logError);
                }
            }
        }

        return ctx.send(200);
    },
}));

