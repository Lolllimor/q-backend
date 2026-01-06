
import crypto from 'crypto';

module.exports = {
    async webhook(ctx) {
        const secret = process.env.PAYSTACK_SECRET;

        const signature = ctx.request.headers['x-paystack-signature'];
        const body = JSON.stringify(ctx.request.body);

        const hash = crypto
            .createHmac('sha512', secret)
            .update(body)
            .digest('hex');

        // 1️⃣ Verify Paystack
        if (hash !== signature) {
            return ctx.unauthorized('Invalid signature');
        }

        const event = ctx.request.body;

        // 2️⃣ Only act on successful payment
        if (event.event === 'charge.success') {
            const reference = event.data.reference;

            const order = await strapi.db
                .query('api::order.order')
                .findOne({ where: { reference } });

            if (order && !order.paid) {
                await strapi.db
                    .query('api::order.order')
                    .update({
                        where: { id: order.id },
                        data: { paid: true },
                    });
            }
        }

        return ctx.send({ received: true });
    },
};
