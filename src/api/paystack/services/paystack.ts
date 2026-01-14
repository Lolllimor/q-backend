/**
 * Paystack service
 * Handles all Paystack API interactions and utilities
 */

import crypto from 'crypto';

interface PaystackService {
    verifyTransaction(reference: string): Promise<any>;
    validateWebhookSignature(body: string, signature: string): boolean;
    generateEventId(reference: string, eventType: string): string;
    logTransaction(
        orderId: number,
        reference: string,
        eventType: 'create' | 'verify' | 'webhook',
        status: 'success' | 'failed' | 'pending',
        metadata?: any,
        errorMessage?: string,
        paystackEvent?: string
    ): Promise<any>;
    isEventProcessed(reference: string, eventType: 'create' | 'verify' | 'webhook'): Promise<boolean>;
    getOrderByReference(reference: string): Promise<any>;
}

export default {
    /**
     * Verify transaction with Paystack API
     */
    async verifyTransaction(reference: string) {
        const paystackSecret = process.env.PAYSTACK_SECRET;

        if (!paystackSecret) {
            throw new Error('PAYSTACK_SECRET is not defined in environment variables');
        }

        try {
            const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${paystackSecret}`,
                },
            });

            const data: any = await response.json();

            if (!response.ok) {
                throw new Error(`Paystack API error: ${data.message}`);
            }

            return {
                success: data.status === true && data.data.status === 'success',
                data: data.data,
                message: data.message,
            };
        } catch (error: any) {
            throw new Error(`Failed to verify transaction: ${error.message}`);
        }
    },

    /**
     * Validate webhook signature
     */
    validateWebhookSignature(body: string, signature: string): boolean {
        const secret = process.env.PAYSTACK_SECRET;

        if (!secret) {
            console.error('PAYSTACK_SECRET not configured');
            return false;
        }

        const hash = crypto
            .createHmac('sha512', secret)
            .update(body)
            .digest('hex');

        return hash === signature;
    },

    /**
     * Generate unique event ID for idempotency
     */
    generateEventId(reference: string, eventType: string): string {
        return `${reference}_${eventType}_${Date.now()}`;
    },

    /**
     * Log transaction for idempotency tracking
     */
    async logTransaction(
        orderId: number,
        reference: string,
        eventType: 'create' | 'verify' | 'webhook',
        status: 'success' | 'failed' | 'pending',
        metadata?: any,
        errorMessage?: string,
        paystackEvent?: string
    ) {
        try {
            const eventId = this.generateEventId(reference, eventType);

            return await strapi.entityService.create('api::transaction-log.transaction-log', {
                data: {
                    orderId,
                    reference,
                    eventType,
                    status,
                    eventId,
                    metadata: metadata || {},
                    errorMessage,
                    paystackEvent,
                },
            });
        } catch (error: any) {
            console.error('Failed to log transaction:', error.message);
            // Don't throw, as logging failure shouldn't break the main flow
        }
    },

    /**
     * Check if event was already processed (idempotency)
     */
    async isEventProcessed(reference: string, eventType: 'create' | 'verify' | 'webhook'): Promise<boolean> {
        try {
            const eventId = this.generateEventId(reference, eventType);

            const existingLog = await strapi.db
                .query('api::transaction-log.transaction-log')
                .findOne({
                    where: {
                        eventId,
                        status: 'success',
                    },
                });

            return !!existingLog;
        } catch (error) {
            console.error('Error checking event processing:', error);
            return false;
        }
    },

    /**
     * Get order by reference (for idempotency)
     */
    async getOrderByReference(reference: string) {
        try {
            const orders = await strapi.entityService.findMany('api::order.order', {
                filters: {
                    reference,
                },
                limit: 1,
            });

            return orders.length > 0 ? orders[0] : null;
        } catch (error: any) {
            console.error('Error fetching order:', error.message);
            return null;
        }
    },
} as PaystackService;

