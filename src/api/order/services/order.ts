/**
 * order service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::order.order', ({ strapi }) => ({
    /**
     * Create order with idempotency
     * Returns existing order if reference already exists
     */
    async createOrderIdempotent(orderData: {
        reference: string;
        amount: number;
        customerName: string;
        email: string;
        phone?: string;
        artworkId?: number;
        artworkDocumentId?: string;
    }) {
        try {
            // Check if order with reference already exists (idempotency)
            const existingOrder = await strapi.entityService.findMany('api::order.order', {
                filters: {
                    reference: orderData.reference,
                },
                limit: 1,
            });

            if (existingOrder.length > 0) {
                // Return existing order (idempotent)
                return {
                    isNew: false,
                    order: existingOrder[0],
                };
            }

            // Create new order
            const newOrder = await strapi.entityService.create('api::order.order', {
                data: {
                    reference: orderData.reference,
                    amount: orderData.amount,
                    customerName: orderData.customerName,
                    email: orderData.email,
                    phone: orderData.phone || '',
                    artworkId: orderData.artworkId || null,
                    artworkDocumentId: orderData.artworkDocumentId || null,
                    status: 'pending',
                    paid: false,
                } as any,
            });

            return {
                isNew: true,
                order: newOrder,
            };
        } catch (error: any) {
            throw new Error(`Failed to create order: ${error.message}`);
        }
    },

    /**
     * Verify payment and update order status
     * Idempotent - calling multiple times is safe
     */
    async verifyPaymentIdempotent(orderId: number, reference: string) {
        try {
            // Fetch order
            const order = await strapi.entityService.findOne('api::order.order', orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            // If already paid, return immediately (idempotent)
            if (order.status === 'paid') {
                return {
                    alreadyPaid: true,
                    order,
                    message: 'Order is already paid',
                };
            }

            // Verify with Paystack
            const paystackService = strapi.service('api::paystack.paystack');
            const verification = await paystackService.verifyTransaction(reference);

            if (!verification.success) {
                // Update order status to failed
                const failedOrder = await strapi.entityService.update('api::order.order', orderId, {
                    data: {
                        status: 'failed',
                        failureReason: 'Payment verification failed',
                    },
                });

                return {
                    alreadyPaid: false,
                    order: failedOrder,
                    success: false,
                    message: 'Payment verification failed',
                };
            }

            // Update order to paid
            const paidOrder = await strapi.entityService.update('api::order.order', orderId, {
                data: {
                    paid: true,
                    status: 'paid',
                    transactionId: verification.data?.id?.toString() || reference,
                },
            });

            // Mark artwork as sold if artworkId exists
            if (order.artworkId) {
                try {
                    const artwork: any = await strapi.entityService.findOne('api::artwork.artwork', order.artworkId);

                    if (artwork && !artwork.sold) {
                        await strapi.entityService.update('api::artwork.artwork', order.artworkId, {
                            data: {
                                sold: true,
                                BoughtBy: order.customerName
                            } as any,
                        });
                    }
                } catch (artworkError: any) {
                    console.error(`Failed to mark artwork ${order.artworkId} as sold:`, artworkError.message);
                    // Don't throw - order is already paid, artwork update is secondary
                }
            }

            return {
                alreadyPaid: false,
                order: paidOrder,
                success: true,
                message: 'Order verified and paid',
            };
        } catch (error: any) {
            throw new Error(`Payment verification failed: ${error.message}`);
        }
    },

    /**
     * Update order payment status from webhook
     * Idempotent - checks if already paid before updating
     */
    async updatePaymentStatusFromWebhook(reference: string) {
        try {
            const paystackService = strapi.service('api::paystack.paystack');

            // Get order by reference
            const order = await paystackService.getOrderByReference(reference);

            if (!order) {
                throw new Error('Order not found');
            }

            // If already paid, return immediately (idempotent)
            if (order.status === 'paid') {
                return {
                    alreadyPaid: true,
                    order,
                    message: 'Order already marked as paid',
                };
            }

            // Update to paid
            const updatedOrder = await strapi.entityService.update('api::order.order', order.id, {
                data: {
                    paid: true,
                    status: 'paid',
                },
            });

            // Mark artwork as sold if artworkId exists
            if (order.artworkId) {
                try {
                    const artwork: any = await strapi.entityService.findOne('api::artwork.artwork', order.artworkId);

                    if (artwork && !artwork.sold) {
                        await strapi.entityService.update('api::artwork.artwork', order.artworkId, {
                            data: {
                                sold: true,
                                BoughtBy: order.customerName
                            } as any,
                        });
                    }
                } catch (artworkError: any) {
                    console.error(`Failed to mark artwork ${order.artworkId} as sold:`, artworkError.message);
                    // Don't throw - order is already paid, artwork update is secondary
                }
            }

            return {
                alreadyPaid: false,
                order: updatedOrder,
                success: true,
            };
        } catch (error: any) {
            throw new Error(`Failed to update payment status: ${error.message}`);
        }
    },
}));

