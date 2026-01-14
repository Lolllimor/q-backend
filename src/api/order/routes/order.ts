/**
 * order router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::order.order', {
    // Only enable GET routes (list and find)
    // Disable POST to avoid conflicts with custom /orders/create endpoint
    only: ['find', 'findOne'],
});
