'use strict';
const crypto = require('crypto');

module.exports = {
    async webhook(ctx) {
        const secret = process.env.PAYSTACK_SECRET;

        if (!secret) {
            console.error('PAYSTACK_SECRET not set');
            return ctx.internalServerError('Configuration error');
        }

        const signature = ctx.request.headers['x-paystack-signature'];
        const body = JSON.stringify(ctx.request.body);

        const hash = crypto
            .createHmac('sha512', secret)
            .update(body)
            .digest('hex');

        // 1️⃣ Verify Paystack signature
        if (hash !== signature) {
            console.error('Invalid Paystack signature');
            return ctx.unauthorized('Invalid signature');
        }

        const event = ctx.request.body;

        // 2️⃣ Only act on successful payment
        if (event.event === 'charge.success') {
            const reference = event.data.reference;

            try {
                const paystackService = strapi.service('api::paystack.paystack');
                const orderService = strapi.service('api::order.order');

                // Generate unique event ID for idempotency
                const eventId = `${reference}_webhook_${event.data.id}`;

                // Check if event was already processed (idempotency)
                const existingLog = await strapi.db
                    .query('api::transaction-log.transaction-log')
                    .findOne({
                        where: {
                            eventId,
                            status: 'success',
                        },
                    });

                if (existingLog) {
                    // Event already processed, return success (idempotent)
                    console.log(`Webhook for reference ${reference} already processed`);
                    return ctx.send({ received: true, isDuplicate: true });
                }

                // Find order by reference
                const order = await paystackService.getOrderByReference(reference);

                if (!order) {
                    // Order not found, log and continue (webhook shouldn't fail for missing orders)
                    console.warn(`Order not found for reference: ${reference}`);
                    await paystackService.logTransaction(
                        0,
                        reference,
                        'webhook',
                        'failed',
                        { webhookEvent: event.event },
                        'Order not found',
                        event.event
                    );
                    return ctx.send({ received: true, orderFound: false });
                }

                // Update order status
                const result = await orderService.updatePaymentStatusFromWebhook(reference);

                // Log successful webhook processing
                await paystackService.logTransaction(
                    order.id,
                    reference,
                    'webhook',
                    'success',
                    { webhookEvent: event.event, eventId },
                    undefined,
                    event.event
                );

                console.log(`Order ${order.id} updated to paid via webhook`);

                return ctx.send({ received: true, success: true });
            } catch (error) {
                console.error('Error processing webhook:', error);

                // Log failed webhook processing
                try {
                    const paystackService = strapi.service('api::paystack.paystack');
                    await paystackService.logTransaction(
                        0,
                        event.data.reference,
                        'webhook',
                        'failed',
                        { webhookEvent: event.event },
                        error.message,
                        event.event
                    );
                } catch (logError) {
                    console.error('Failed to log webhook error:', logError);
                }

                // Return 200 to acknowledge receipt, but log the error
                return ctx.send({ received: true, error: error.message });
            }
        }

        // Other webhook events
        return ctx.send({ received: true });
    },
};
