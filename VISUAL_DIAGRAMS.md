/**
 * ============================================================================
 * PAYSTACK INTEGRATION - VISUAL DIAGRAMS & QUICK REFERENCE
 * ============================================================================
 */

// ============================================================================
// DIAGRAM 1: COMPLETE PAYMENT FLOW
// ============================================================================

/**
 * CUSTOMER JOURNEY:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        CUSTOMER BROWSER                                 │
 * │                                                                          │
 * │  1. User finds artwork                                                  │
 * │     ┌──────────────────────────┐                                        │
 * │     │ Artwork Card             │                                        │
 * │     │ Title: Sunset Portrait   │                                        │
 * │     │ Price: ₦50,000          │                                        │
 * │     │ [BUY NOW] Button         │                                        │
 * │     └──────────────────────────┘                                        │
 * │                ↓ (Click BUY NOW)                                        │
 * │                                                                          │
 * │  2. PaymentModal opens (Form)                                           │
 * │     ┌──────────────────────────────────────┐                           │
 * │     │ First Name: [_________]              │                           │
 * │     │ Last Name:  [_________]              │                           │
 * │     │ Email:      [_________@example.com]  │                           │
 * │     │ Phone:      [_________]              │                           │
 * │     │ [Proceed to Payment] Button          │                           │
 * │     └──────────────────────────────────────┘                           │
 * │                ↓ (Fill form & click)                                    │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                 ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    STRAPI BACKEND                                       │
 * │                                                                          │
 * │  POST /api/orders/create                                               │
 * │  {                                                                      │
 * │    reference: "1704667849123",                                         │
 * │    amount: 5000000,                                                    │
 * │    customerName: "Chidi Okafor",                                       │
 * │    email: "chidi@example.com",                                         │
 * │    phone: "08012345678",                                               │
 * │    artworkId: 15                                                       │
 * │  }                                                                      │
 * │         ↓ Processing...                                                │
 * │    1. Validate all fields ✓                                            │
 * │    2. Check reference exists? No                                       │
 * │    3. Create order in database                                         │
 * │         INSERT INTO orders (...)                                       │
 * │         Result: orderId = 42                                           │
 * │    4. Log transaction for audit trail                                  │
 * │         INSERT INTO transaction_logs (...)                             │
 * │    5. Return order details                                             │
 * │                                                                          │
 * │  Response:                                                              │
 * │  {                                                                      │
 * │    success: true,                                                      │
 * │    data: {                                                             │
 * │      orderId: 42,                                                      │
 * │      reference: "1704667849123",                                       │
 * │      amount: 5000000,                                                  │
 * │      status: "pending"                                                 │
 * │    }                                                                    │
 * │  }                                                                      │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                 ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │              DATABASE (PostgreSQL on Render)                            │
 * │                                                                          │
 * │  orders table:                                                          │
 * │  ┌────┬──────────────────┬──────────┬─────────┐                        │
 * │  │ id │ reference        │ amount   │ status  │                        │
 * │  ├────┼──────────────────┼──────────┼─────────┤                        │
 * │  │ 42 │ 1704667849123    │ 5000000  │ pending │                        │
 * │  └────┴──────────────────┴──────────┴─────────┘                        │
 * │                                                                          │
 * │  transaction_logs table:                                               │
 * │  ┌────┬──────────┬──────────────────┬─────────┐                        │
 * │  │ id │ orderId  │ reference        │ event   │                        │
 * │  ├────┼──────────┼──────────────────┼─────────┤                        │
 * │  │ 1  │ 42       │ 1704667849123    │ create  │                        │
 * │  └────┴──────────┴──────────────────┴─────────┘                        │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                 ↓ (Response back to frontend)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        CUSTOMER BROWSER                                 │
 * │                                                                          │
 * │  3. Paystack Modal opens                                               │
 * │     ┌──────────────────────────────┐                                   │
 * │     │ PAYSTACK PAYMENT MODAL       │                                   │
 * │     │                              │                                   │
 * │     │ Amount: ₦50,000             │                                   │
 * │     │ Email: chidi@example.com    │                                   │
 * │     │                              │                                   │
 * │     │ Card Number: [____________]  │                                   │
 * │     │ Expiry: [__/__]              │                                   │
 * │     │ CVV: [___]                   │                                   │
 * │     │                              │                                   │
 * │     │ [Complete Payment] Button    │                                   │
 * │     └──────────────────────────────┘                                   │
 * │                ↓ (Enter card & click)                                   │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                 ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        PAYSTACK API                                    │
 * │                                                                          │
 * │  1. Validate card details                                              │
 * │  2. Process payment through Visa/Mastercard                           │
 * │  3. Charge ₦50,000 to Chidi's card                                    │
 * │  4. Success! Transaction ID: 12345678                                 │
 * │                                                                          │
 * │  Returns TWO responses:                                                 │
 * │                                                                          │
 * │  A) To Frontend (immediate)                                            │
 * │     {                                                                   │
 * │       "status": "success",                                             │
 * │       "reference": "1704667849123",                                    │
 * │       "message": "Approval code: 123456"                              │
 * │     }                                                                   │
 * │                                                                          │
 * │  B) Webhook to Backend (async, could arrive anytime)                  │
 * │     POST /paystack/webhook                                             │
 * │     {                                                                   │
 * │       "event": "charge.success",                                       │
 * │       "data": {                                                         │
 * │         "id": 12345678,                                                │
 * │         "reference": "1704667849123",                                  │
 * │         "amount": 5000000,                                             │
 * │         "status": "success"                                            │
 * │       }                                                                 │
 * │     }                                                                   │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                 ↓ (A) to Frontend
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        CUSTOMER BROWSER                                 │
 * │                                                                          │
 * │  4. onSuccess callback fires                                           │
 * │     Paystack modal closes                                               │
 * │                                                                          │
 * │  POST /api/orders/verify                                               │
 * │  {                                                                      │
 * │    orderId: 42,                                                        │
 * │    reference: "1704667849123"                                          │
 * │  }                                                                      │
 * │         ↓ Processing...                                                │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                 ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    STRAPI BACKEND                                       │
 * │                                                                          │
 * │  POST /api/orders/verify                                               │
 * │         ↓ Processing...                                                │
 * │    1. Check Idempotency-Key header → Not found before                 │
 * │    2. Fetch order from database                                        │
 * │    3. Check status? Still "pending"                                    │
 * │    4. Call Paystack verify API                                         │
 * │         GET /transaction/verify/1704667849123                          │
 * │         → Paystack confirms: Payment successful ✓                      │
 * │    5. Update order in database                                         │
 * │         UPDATE orders SET status = "paid" WHERE id = 42               │
 * │    6. Log verification event                                           │
 * │         INSERT INTO transaction_logs (eventType: "verify", status: ok) │
 * │    7. Return success response                                          │
 * │                                                                          │
 * │  Response:                                                              │
 * │  {                                                                      │
 * │    success: true,                                                      │
 * │    message: "Order verified and paid",                                │
 * │    data: {                                                             │
 * │      orderId: 42,                                                      │
 * │      status: "paid"                                                    │
 * │    }                                                                    │
 * │  }                                                                      │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                 ↓ (Response back to frontend)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        CUSTOMER BROWSER                                 │
 * │                                                                          │
 * │  5. Show success page                                                  │
 * │     ┌────────────────────────────────┐                                 │
 * │     │ ✓ PAYMENT SUCCESSFUL           │                                 │
 * │     │                                │                                 │
 * │     │ Order #42                      │                                 │
 * │     │ Reference: 1704667849123       │                                 │
 * │     │ Amount: ₦50,000               │                                 │
 * │     │                                │                                 │
 * │     │ Thank you!                     │                                 │
 * │     │                                │                                 │
 * │     │ [Download Receipt]             │                                 │
 * │     │ [View Gallery]                 │                                 │
 * │     └────────────────────────────────┘                                 │
 * │                                                                          │
 * │  (Meanwhile, Paystack webhook might arrive...)                         │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                 ↓ (B) Webhook (could arrive anytime)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    STRAPI BACKEND                                       │
 * │                                                                          │
 * │  POST /paystack/webhook (from Paystack)                                │
 * │         ↓ Processing...                                                │
 * │    1. Validate signature (HMAC-SHA512)                                 │
 * │    2. Check event type = "charge.success"                              │
 * │    3. Generate unique event ID for idempotency                         │
 * │    4. Check if already processed?                                      │
 * │       → YES! (from verify step above)                                  │
 * │    5. Skip update, return success (idempotent!)                        │
 * │    6. Log webhook event                                                │
 * │                                                                          │
 * │  Response to Paystack:                                                 │
 * │  {                                                                      │
 * │    received: true,                                                     │
 * │    isDuplicate: true                                                   │
 * │  }                                                                      │
 * │                                                                          │
 * │  Note: Order NOT updated again (already "paid" from verify step)       │
 * │        But webhook execution logged for audit trail                    │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * FINAL STATE:
 * ───────────
 * 
 * Database: orders table
 * ┌────┬──────────────────┬──────────┬─────────┬───────────────┐
 * │ id │ reference        │ amount   │ status  │ transactionId │
 * ├────┼──────────────────┼──────────┼─────────┼───────────────┤
 * │ 42 │ 1704667849123    │ 5000000  │ paid    │ 12345678      │
 * └────┴──────────────────┴──────────┴─────────┴───────────────┘
 * 
 * Database: transaction_logs table
 * ┌────┬──────────┬──────────────────┬─────────┐
 * │ id │ orderId  │ reference        │ event   │
 * ├────┼──────────┼──────────────────┼─────────┤
 * │ 1  │ 42       │ 1704667849123    │ create  │
 * │ 2  │ 42       │ 1704667849123    │ verify  │
 * │ 3  │ 42       │ 1704667849123    │ webhook │
 * └────┴──────────┴──────────────────┴─────────┘
 */

// ============================================================================
// DIAGRAM 2: IDEMPOTENCY PROTECTION
// ============================================================================

/**
 * SCENARIO: Double-click "Buy Now" button
 * 
 * Timeline:
 * ─────────
 * 
 * T0: User clicks [BUY NOW]
 *     │
 *     ├─ Click 1: POST /api/orders/create
 *     │   Body: { reference: "1704667849123", ... }
 *     │   ├─ Backend: Check reference in database? NO
 *     │   ├─ Backend: Create new order (ID = 42)
 *     │   ├─ Backend: Log transaction
 *     │   └─ Response: { success: true, orderId: 42 }
 *     │   │
 *     │   └─ Then: Show Paystack modal
 *     │
 *     └─ T100ms: Click 2: POST /api/orders/create (accidental double-click!)
 *         Body: { reference: "1704667849123", ... }  ← SAME reference!
 *         ├─ Backend: Check reference in database? YES! (Found ID 42)
 *         ├─ Backend: Return existing order (DON'T create new)
 *         ├─ Backend: Log as idempotent replay
 *         └─ Response: { success: true, orderId: 42 }  ← SAME ORDER!
 * 
 * RESULT:
 * ───────
 * Database has only 1 order!
 * Both clicks returned same orderId = 42
 * No duplicate orders created ✓
 * 
 * 
 * SCENARIO: Network timeout during verify, user retries
 * 
 * Timeline:
 * ─────────
 * 
 * T0: Payment successful, Paystack returns success
 *     │
 *     └─ onSuccess callback fires
 *         │
 *         └─ Frontend: POST /api/orders/verify
 *             Body: { orderId: 42, reference: "1704667849123" }
 *             ├─ Backend: Verify with Paystack API
 *             ├─ Backend: Update order to "paid"
 *             ├─ Backend: Log event
 *             └─ Response: { success: true }
 * 
 * T500ms: Response hasn't arrived yet
 *         Network timeout!
 *         │
 *         └─ Frontend (T1000ms): User clicks [Verify Again]
 *             │
 *             └─ Frontend: POST /api/orders/verify (AGAIN!)
 *                 Body: { orderId: 42, reference: "1704667849123" }
 *                 ├─ Backend: Check Idempotency-Key header
 *                 ├─ Backend: Found in transaction_logs (from first call!)
 *                 ├─ Backend: Return cached response immediately
 *                 │           (DON'T call Paystack again)
 *                 │           (DON'T update database again)
 *                 └─ Response: { success: true, isIdempotentReplay: true }
 * 
 * RESULT:
 * ───────
 * Order updated only ONCE in database ✓
 * Paystack API called only ONCE (no extra charges!) ✓
 * Both verify requests returned success ✓
 * Frontend recovers gracefully from timeout ✓
 * 
 * 
 * SCENARIO: Webhook arrives multiple times (Paystack retries)
 * 
 * Timeline:
 * ─────────
 * 
 * T0: Payment successful at Paystack
 *     │
 *     ├─ Webhook 1: POST /paystack/webhook (sent by Paystack)
 *     │   Body: { event: "charge.success", data: {...} }
 *     │   ├─ Backend: Validate signature ✓
 *     │   ├─ Backend: Generate eventId = "1704667849123_webhook_12345678"
 *     │   ├─ Backend: Check if eventId exists? NO (first time)
 *     │   ├─ Backend: Update order to "paid"
 *     │   ├─ Backend: Log webhook event
 *     │   └─ Response: { received: true }
 *     │
 *     └─ T30000ms: Paystack retries webhook (timeout recovery)
 *         │
 *         └─ Webhook 2: POST /paystack/webhook (retry)
 *             Body: { event: "charge.success", data: {...} } ← SAME
 *             ├─ Backend: Validate signature ✓
 *             ├─ Backend: Generate eventId = "1704667849123_webhook_12345678"
 *             ├─ Backend: Check if eventId exists? YES! (found from Webhook 1)
 *             ├─ Backend: Skip update (already processed)
 *             ├─ Backend: Return success immediately (idempotent!)
 *             └─ Response: { received: true }
 * 
 * RESULT:
 * ───────
 * Order updated only ONCE even though webhook came twice ✓
 * Paystack thinks webhook was successful both times ✓
 * No double charging (webhook is idempotent) ✓
 * Audit trail shows both webhook attempts ✓
 */

// ============================================================================
// DIAGRAM 3: DATABASE SCHEMA
// ============================================================================

/**
 * PostgreSQL Database Schema
 * 
 * TABLE: orders
 * ───────────────────────────────────────────────────────────────────────
 * Column          │ Type           │ Constraints      │ Purpose
 * ────────────────┼────────────────┼──────────────────┼──────────────────
 * id              │ serial         │ PRIMARY KEY      │ Auto-incrementing ID
 * reference       │ varchar        │ UNIQUE, NOT NULL │ Paystack reference
 * amount          │ bigint         │ NOT NULL         │ Amount in kobo
 * paid            │ boolean        │ DEFAULT false    │ Legacy payment flag
 * status          │ enum           │ DEFAULT pending  │ pending/paid/failed
 * customerName    │ varchar        │ NOT NULL         │ Customer's full name
 * email           │ varchar        │ NOT NULL         │ Customer's email
 * phone           │ varchar        │ NULL             │ Customer's phone
 * artworkId       │ integer        │ NULL             │ Related artwork ID
 * transactionId   │ varchar        │ NULL             │ Paystack transaction ID
 * failureReason   │ text           │ NULL             │ If payment failed
 * createdAt       │ timestamp      │ DEFAULT NOW()    │ Creation timestamp
 * updatedAt       │ timestamp      │ DEFAULT NOW()    │ Last update timestamp
 * 
 * Example row:
 * id = 42
 * reference = "1704667849123"
 * amount = 5000000
 * paid = true
 * status = "paid"
 * customerName = "Chidi Okafor"
 * email = "chidi@example.com"
 * phone = "08012345678"
 * artworkId = 15
 * transactionId = "12345678"
 * failureReason = NULL
 * createdAt = 2024-01-08 10:30:49
 * updatedAt = 2024-01-08 10:30:55
 * 
 * ───────────────────────────────────────────────────────────────────────
 * 
 * TABLE: transaction_logs
 * ───────────────────────────────────────────────────────────────────────
 * Column          │ Type           │ Constraints      │ Purpose
 * ────────────────┼────────────────┼──────────────────┼──────────────────
 * id              │ serial         │ PRIMARY KEY      │ Auto-incrementing ID
 * orderId         │ integer        │ NOT NULL         │ Related order ID
 * reference       │ varchar        │ NOT NULL         │ Paystack reference
 * eventType       │ enum           │ NOT NULL         │ create/verify/webhook
 * paystackEvent   │ varchar        │ NULL             │ Paystack event type
 * status          │ enum           │ DEFAULT pending  │ success/failed/pending
 * eventId         │ varchar        │ UNIQUE, NOT NULL │ Unique event identifier
 * metadata        │ json           │ NULL             │ Additional event data
 * errorMessage    │ text           │ NULL             │ Error details if failed
 * createdAt       │ timestamp      │ DEFAULT NOW()    │ Event timestamp
 * 
 * Example rows:
 * 
 * id = 1
 * orderId = 42
 * reference = "1704667849123"
 * eventType = "create"
 * paystackEvent = NULL
 * status = "success"
 * eventId = "1704667849123_create_1704667849"
 * metadata = { "isNew": true, "customFields": {...} }
 * errorMessage = NULL
 * createdAt = 2024-01-08 10:30:49
 * ───────────────────────────────────────────────────────────────────────
 * 
 * id = 2
 * orderId = 42
 * reference = "1704667849123"
 * eventType = "verify"
 * paystackEvent = NULL
 * status = "success"
 * eventId = "1704667849123_verify_1704667855"
 * metadata = { "alreadyPaid": false }
 * errorMessage = NULL
 * createdAt = 2024-01-08 10:30:55
 * ───────────────────────────────────────────────────────────────────────
 * 
 * id = 3
 * orderId = 42
 * reference = "1704667849123"
 * eventType = "webhook"
 * paystackEvent = "charge.success"
 * status = "success"
 * eventId = "1704667849123_webhook_12345678"
 * metadata = { "webhookEvent": "charge.success" }
 * errorMessage = NULL
 * createdAt = 2024-01-08 10:30:50 (could arrive anytime)
 */

// ============================================================================
// DIAGRAM 4: API ENDPOINT QUICK REFERENCE
// ============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ENDPOINT 1: CREATE ORDER                                            │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                      │
 * │ POST /api/orders/create                                            │
 * │                                                                      │
 * │ Request Headers:                                                    │
 * │   Content-Type: application/json                                   │
 * │                                                                      │
 * │ Request Body:                                                       │
 * │ {                                                                   │
 * │   "reference": "1704667849123",      (Required, unique)            │
 * │   "amount": 5000000,                 (Required, > 0)               │
 * │   "customerName": "Chidi Okafor",    (Required)                    │
 * │   "email": "chidi@example.com",      (Required, valid email)       │
 * │   "phone": "08012345678",            (Optional)                    │
 * │   "artworkId": 15                    (Optional)                    │
 * │ }                                                                   │
 * │                                                                      │
 * │ Response (200 OK):                                                  │
 * │ {                                                                   │
 * │   "success": true,                                                 │
 * │   "message": "Order created successfully",                         │
 * │   "isNew": true,          (false if returned existing)             │
 * │   "data": {                                                         │
 * │     "orderId": 42,                                                 │
 * │     "reference": "1704667849123",                                  │
 * │     "amount": 5000000,                                             │
 * │     "status": "pending",                                           │
 * │     "customerName": "Chidi Okafor",                                │
 * │     "email": "chidi@example.com"                                   │
 * │   }                                                                 │
 * │ }                                                                   │
 * │                                                                      │
 * │ Response (400 Bad Request):                                         │
 * │ {                                                                   │
 * │   "success": false,                                                │
 * │   "message": "Missing required fields: reference, amount, ..."    │
 * │ }                                                                   │
 * │                                                                      │
 * │ Idempotency: ✓ (same reference returns same order)                │
 * │                                                                      │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ENDPOINT 2: VERIFY PAYMENT                                          │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                      │
 * │ POST /api/orders/verify                                            │
 * │                                                                      │
 * │ Request Headers:                                                    │
 * │   Content-Type: application/json                                   │
 * │   Idempotency-Key: 42_1704667849123  (Recommended, optional)       │
 * │                                                                      │
 * │ Request Body:                                                       │
 * │ {                                                                   │
 * │   "orderId": 42,              (Required, from create response)     │
 * │   "reference": "1704667849123" (Required, from Paystack)           │
 * │ }                                                                   │
 * │                                                                      │
 * │ Response (200 OK):                                                  │
 * │ {                                                                   │
 * │   "success": true,                                                 │
 * │   "message": "Order verified and paid",                            │
 * │   "alreadyPaid": false,       (true if order already paid)         │
 * │   "data": {                                                         │
 * │     "orderId": 42,                                                 │
 * │     "status": "paid",                                              │
 * │     "paid": true                                                   │
 * │   }                                                                 │
 * │ }                                                                   │
 * │                                                                      │
 * │ Response (400 Bad Request):                                         │
 * │ {                                                                   │
 * │   "error": "Missing required fields: orderId, reference"           │
 * │ }                                                                   │
 * │                                                                      │
 * │ Response (500 Server Error):                                        │
 * │ {                                                                   │
 * │   "error": "Payment verification failed: [reason]"                 │
 * │ }                                                                   │
 * │                                                                      │
 * │ Idempotency: ✓ (same data returns cached response)                │
 * │                                                                      │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ENDPOINT 3: WEBHOOK (Paystack to Backend)                           │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                      │
 * │ POST /paystack/webhook                                             │
 * │                                                                      │
 * │ Request Headers (from Paystack):                                    │
 * │   x-paystack-signature: [HMAC-SHA512 hash]                        │
 * │   Content-Type: application/json                                   │
 * │                                                                      │
 * │ Request Body:                                                       │
 * │ {                                                                   │
 * │   "event": "charge.success",                                       │
 * │   "data": {                                                         │
 * │     "id": 12345678,                                                │
 * │     "reference": "1704667849123",                                  │
 * │     "amount": 5000000,                                             │
 * │     "status": "success",                                           │
 * │     "paid_at": "2024-01-08T10:30:45.000Z",                        │
 * │     "customer": {                                                   │
 * │       "id": 987654,                                                │
 * │       "email": "chidi@example.com"                                 │
 * │     }                                                               │
 * │   }                                                                 │
 * │ }                                                                   │
 * │                                                                      │
 * │ Response (200 OK):                                                  │
 * │ {                                                                   │
 * │   "received": true,                                                │
 * │   "success": true,          (if processed successfully)            │
 * │   "isDuplicate": false      (true if already processed)            │
 * │ }                                                                   │
 * │                                                                      │
 * │ Backend Processing:                                                 │
 * │ 1. Validate webhook signature                                       │
 * │ 2. Check event type = "charge.success"                             │
 * │ 3. Generate unique eventId                                         │
 * │ 4. Check if already processed (idempotency)                        │
 * │ 5. Find order by reference                                         │
 * │ 6. Check if already paid                                           │
 * │ 7. Update order status to "paid" (if not already)                 │
 * │ 8. Log webhook event                                               │
 * │                                                                      │
 * │ Idempotency: ✓ (duplicate webhooks handled gracefully)            │
 * │                                                                      │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// DIAGRAM 5: ERROR HANDLING FLOWCHART
// ============================================================================

/**
 * CUSTOMER TRIES TO BUY
 * │
 * └─ Does form validation pass?
 *    ├─ NO  → Show error message
 *    │       └─ User fixes and retries
 *    │
 *    └─ YES → POST /api/orders/create
 *             │
 *             └─ Does request succeed? (200 OK)
 *                ├─ NO  (Error 400/500)
 *                │      → Show error: "Failed to create order"
 *                │      └─ User can retry (safe!)
 *                │
 *                └─ YES → Order created
 *                         │
 *                         └─ Show Paystack modal
 *                            │
 *                            └─ User enters card
 *                               │
 *                               └─ Does Paystack accept?
 *                                  ├─ NO (payment declined)
 *                                  │  → Show error
 *                                  │  → Order stays "pending"
 *                                  │  └─ User can retry
 *                                  │
 *                                  └─ YES (payment successful)
 *                                     │
 *                                     └─ onSuccess callback
 *                                        │
 *                                        └─ POST /api/orders/verify
 *                                           │
 *                                           └─ Does verify succeed? (200 OK)
 *                                              ├─ NO (Network error/timeout)
 *                                              │  → Show warning but don't panic
 *                                              │  → Payment already done at Paystack
 *                                              │  → Webhook will update order later
 *                                              │  → User can check email
 *                                              │
 *                                              └─ YES (verifyData.success = true)
 *                                                 │
 *                                                 └─ 🎉 SHOW SUCCESS PAGE
 *                                                    │
 *                                                    └─ Order status = "paid"
 *                                                       in database ✓
 */

// ============================================================================
// DIAGRAM 6: ENVIRONMENT VARIABLES
// ============================================================================

/**
 * DEVELOPMENT (.env.local or .env)
 * ─────────────────────────────────
 * 
 * BACKEND (Strapi - /q-backend/.env):
 *   PAYSTACK_SECRET=sk_test_1234567890abcdef...
 * 
 * FRONTEND (Next.js - /.env.local):
 *   NEXT_PUBLIC_PAYSTACK_KEY=pk_test_1234567890abcdef...
 * 
 * 
 * PRODUCTION (Render, Vercel, etc.)
 * ──────────────────────────────────
 * 
 * BACKEND (Render Dashboard):
 *   Environment Variables → Add
 *   Name: PAYSTACK_SECRET
 *   Value: sk_live_1234567890abcdef...
 * 
 * FRONTEND (Vercel Dashboard):
 *   Settings → Environment Variables
 *   Name: NEXT_PUBLIC_PAYSTACK_KEY
 *   Value: pk_live_1234567890abcdef...
 * 
 * 
 * ⚠️  NEVER COMMIT THESE TO GITHUB!
 * 
 * .gitignore should include:
 *   .env
 *   .env.local
 *   .env.production.local
 */
