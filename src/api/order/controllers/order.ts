/**
 * order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
    async verify(ctx) {
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
                // Transaction was successful, verify amount if needed, then update order
                // Assuming we look up by reference field in the order or you pass the order ID.
                // If the 'reference' in the Order model stores the Paystack reference:
                const orders = await strapi.entityService.findMany('api::order.order', {
                    filters: { reference: reference },
                    limit: 1
                });

                if (orders.length === 0) {
                    return ctx.notFound('Order not found with that reference');
                }

                const order = orders[0];

                // Update the order to paid
                const updatedOrder = await strapi.entityService.update('api::order.order', order.id, {
                    data: {
                        paid: true,
                    }
                });

                return {
                    message: "Order verified and updated",
                    order: updatedOrder,
                    paid: true
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

        // Validate event
        const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(ctx.request.body)).digest('hex');

        // Check if the x-paystack-signature header matches the hash
        if (hash !== ctx.request.header['x-paystack-signature']) {
            return ctx.badRequest('Invalid signature');
        }

        // Retrieve the request's body
        const event = ctx.request.body;

        // Do something with event
        if (event && event.event === 'charge.success') {
            const reference = event.data.reference;

            try {
                // Find the order
                const orders = await strapi.entityService.findMany('api::order.order', {
                    filters: { reference: reference },
                    limit: 1
                });

                if (orders.length > 0) {
                    const order = orders[0];
                    // Update order status
                    await strapi.entityService.update('api::order.order', order.id, {
                        data: {
                            paid: true
                        }
                    });
                    console.log(`Order ${order.id} updated to paid via webhook`);
                }
            } catch (err) {
                console.error('Error updating order via webhook', err);
            }
        }

        // Return 200 OK to Paystack
        return ctx.send(200);
    }
}));
