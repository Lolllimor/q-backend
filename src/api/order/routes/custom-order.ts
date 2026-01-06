export default {
    routes: [
        {
            method: "POST",
            path: "/orders/verify",
            handler: "order.verify",
            config: {
                auth: false,
            },
        },
        {
            method: "POST",
            path: "/orders/webhook",
            handler: "order.webhook",
            config: {
                auth: false,
            },
        },
    ],
};
