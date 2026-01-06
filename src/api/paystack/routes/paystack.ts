module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/paystack/webhook',
            handler: 'paystack.webhook',
            config: {
                auth: false,
            },
        },
    ],
};
