/**
 * ============================================================================
 * PAYSTACK INTEGRATION - COMPLETE IMPLEMENTATION WALKTHROUGH
 * ============================================================================
 * 
 * Real-World Scenario:
 * A customer (Chidi) wants to buy an artwork (Sunset Portrait - ₦50,000)
 * on your e-commerce platform.
 * 
 * This guide walks through EVERY step of the payment flow.
 * ============================================================================
 */

// ============================================================================
// STAGE 1: ENVIRONMENT SETUP & DATABASE SCHEMA
// ============================================================================

/**
 * 📍 WHAT HAPPENS: Backend prepares to receive payments
 * 
 * 1. Add Environment Variables to .env file
 * 
 * Location: /q-backend/.env
 * 
 * Add these lines:
 * 
 *   PAYSTACK_SECRET=sk_test_1234567890abcdef
 *   NEXT_PUBLIC_PAYSTACK_KEY=pk_test_1234567890abcdef
 * 
 * Where to get these:
 * - Go to dashboard.paystack.com
 * - Settings → API Keys & Webhooks
 * - Copy Test Keys (for development)
 * - Never commit real keys to GitHub (use .env.local)
 * 
 * 2. Database Schema Created (Automatic via Strapi)
 * 
 * When you start Strapi, it creates two tables:
 * 
 * TABLE: orders (stores payment orders)
 * ├── id (auto)
 * ├── reference (unique) - "1704667849123"
 * ├── amount (in kobo) - 5000000 (represents ₦50,000)
 * ├── paid (boolean) - false initially
 * ├── status (enum) - "pending" | "paid" | "failed"
 * ├── customerName (string) - "Chidi Okafor"
 * ├── email (string) - "chidi@example.com"
 * ├── phone (string) - "08012345678"
 * ├── artworkId (number) - 15 (which artwork)
 * ├── transactionId (string) - "12345678" (Paystack ID)
 * └── failureReason (text) - null if successful
 * 
 * TABLE: transaction_logs (audit trail)
 * ├── id (auto)
 * ├── orderId (number) - 1
 * ├── reference (string) - "1704667849123"
 * ├── eventType (enum) - "create" | "verify" | "webhook"
 * ├── status (enum) - "success" | "failed" | "pending"
 * ├── eventId (unique) - for preventing duplicates
 * ├── metadata (json) - { isNew: true, ... }
 * ├── errorMessage (text) - null if no error
 * └── paystackEvent (string) - "charge.success"
 */

// ============================================================================
// STAGE 2: FRONTEND - USER FILLS FORM
// ============================================================================

/**
 * 📍 WHAT HAPPENS: Customer enters their details
 * 
 * Chidi visits your website and sees:
 * 
 * [BUY NOW] Button on Artwork
 * ├── Opens PaymentModal
 * │   ├── First Name: "Chidi"
 * │   ├── Last Name: "Okafor"
 * │   ├── Email: "chidi@example.com"
 * │   ├── Phone: "08012345678"
 * │   └── [Proceed to Payment] Button
 * 
 * When Chidi clicks [Proceed to Payment]:
 * 
 * Frontend JS runs:
 * 
 * const handleBuy = async () => {
 *   // Generate unique reference (timestamp)
 *   const reference = new Date().getTime().toString();
 *   // = "1704667849123"
 * 
 *   // Customer info collected from form
 *   const customerData = {
 *     reference: "1704667849123",
 *     amount: 50000 * 100,  // Convert to kobo: 5000000
 *     customerName: "Chidi Okafor",
 *     email: "chidi@example.com",
 *     phone: "08012345678",
 *     artworkId: 15  // ID of "Sunset Portrait"
 *   };
 *   
 *   // NEXT: Call backend to create order
 * }
 */

// ============================================================================
// STAGE 3: BACKEND - CREATE ORDER ENDPOINT
// ============================================================================

/**
 * 📍 WHAT HAPPENS: Backend creates order before payment
 * 
 * Frontend sends HTTP request:
 * 
 * POST http://localhost:1337/api/orders/create
 * Content-Type: application/json
 * 
 * {
 *   "reference": "1704667849123",
 *   "amount": 5000000,
 *   "customerName": "Chidi Okafor",
 *   "email": "chidi@example.com",
 *   "phone": "08012345678",
 *   "artworkId": 15
 * }
 * 
 * BACKEND PROCESSING (in order.controller.ts):
 * 
 * 1. Validate all fields exist and are valid
 *    ✓ reference provided? Yes
 *    ✓ amount > 0? Yes (5000000)
 *    ✓ customerName provided? Yes
 *    ✓ email provided? Yes
 *    → Validation PASSED
 * 
 * 2. Call orderService.createOrderIdempotent()
 *    - Check if order with reference "1704667849123" exists
 *    - No existing order found
 *    - isNew = true
 * 
 * 3. Create new order in database
 *    INSERT INTO orders (
 *      reference,
 *      amount,
 *      customerName,
 *      email,
 *      phone,
 *      artworkId,
 *      status,
 *      paid
 *    ) VALUES (
 *      "1704667849123",
 *      5000000,
 *      "Chidi Okafor",
 *      "chidi@example.com",
 *      "08012345678",
 *      15,
 *      "pending",
 *      false
 *    )
 *    → Order ID = 42
 * 
 * 4. Log transaction for audit trail
 *    INSERT INTO transaction_logs (
 *      orderId,
 *      reference,
 *      eventType,
 *      status,
 *      eventId,
 *      metadata
 *    ) VALUES (
 *      42,
 *      "1704667849123",
 *      "create",
 *      "success",
 *      "1704667849123_create_1704667849",
 *      { "isNew": true, "customFields": {...} }
 *    )
 * 
 * 5. Return response to frontend
 */

/**
 * RESPONSE from Backend:
 * 
 * HTTP 200 OK
 * Content-Type: application/json
 * 
 * {
 *   "success": true,
 *   "message": "Order created successfully",
 *   "isNew": true,
 *   "data": {
 *     "orderId": 42,
 *     "reference": "1704667849123",
 *     "amount": 5000000,
 *     "status": "pending",
 *     "customerName": "Chidi Okafor",
 *     "email": "chidi@example.com"
 *   }
 * }
 */

/**
 * 🔄 IDEMPOTENCY EXAMPLE:
 * 
 * What if Chidi's click got registered TWICE?
 * Frontend sends same request again:
 * 
 * POST /api/orders/create
 * {
 *   "reference": "1704667849123",
 *   ...same data...
 * }
 * 
 * Backend processing:
 * 1. Check if order with reference "1704667849123" exists
 * 2. YES! Found order ID 42
 * 3. Return SAME order (don't create duplicate)
 * 4. isNew = false
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Order already exists",
 *   "isNew": false,
 *   "data": {
 *     "orderId": 42,
 *     "reference": "1704667849123",
 *     ...
 *   }
 * }
 * 
 * Result: Only 1 order in database, not 2! ✓
 */

// ============================================================================
// STAGE 4: FRONTEND - INITIALIZE PAYSTACK & SHOW MODAL
// ============================================================================

/**
 * 📍 WHAT HAPPENS: Paystack payment modal appears
 * 
 * Frontend JS in useBuyArtwork.ts hook:
 * 
 * const { handleBuy } = useBuyArtwork();
 * 
 * const handleBuy = async () => {
 *   try {
 *     // Step 1: Create order (from previous stage)
 *     const orderResponse = await fetch('/api/orders/create', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(customerData)
 *     });
 *     
 *     const orderResult = await orderResponse.json();
 *     // orderResult.data.orderId = 42
 *     // orderResult.data.reference = "1704667849123"
 * 
 *     // Step 2: Configure Paystack
 *     const config = {
 *       reference: "1704667849123",
 *       email: "chidi@example.com",
 *       amount: 5000000,  // in kobo
 *       publicKey: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
 *       // pk_test_1234567890abcdef
 *       
 *       metadata: {
 *         orderId: 42,                    // ← IMPORTANT!
 *         artworkId: 15,
 *         customerName: "Chidi Okafor",
 *         artworkTitle: "Sunset Portrait"
 *       }
 *     };
 * 
 *     // Step 3: Initialize Paystack payment
 *     const initializePayment = usePaystackPayment(config);
 * 
 *     // Step 4: Show Paystack modal
 *     initializePayment(onSuccess, onClose);
 *   } catch (error) {
 *     console.error('Error:', error);
 *   }
 * };
 * 
 * What Chidi sees:
 * ┌─────────────────────────────┐
 * │  PAYSTACK PAYMENT MODAL     │
 * │                             │
 * │  Amount: ₦50,000           │
 * │  Email: chidi@example.com   │
 * │                             │
 * │  [Enter Card Details]       │
 * │  [Complete Payment]         │
 * └─────────────────────────────┘
 */

// ============================================================================
// STAGE 5: PAYSTACK - PAYMENT PROCESSING
// ============================================================================

/**
 * 📍 WHAT HAPPENS: Paystack processes payment securely
 * 
 * Chidi enters:
 * - Card Number: 4111111111111111
 * - Expiry: 12/25
 * - CVV: 123
 * 
 * Paystack:
 * 1. ✓ Validates card details
 * 2. ✓ Connects to payment gateway (Visa, Mastercard, etc.)
 * 3. ✓ Charges ₦50,000 to Chidi's card
 * 
 * Result: Payment SUCCESSFUL ✓
 * Paystack assigns Transaction ID: 12345678
 * 
 * Paystack now does TWO things:
 * 
 * THING 1: Return to frontend with success
 * {
 *   "status": "success",
 *   "reference": "1704667849123",
 *   "message": "Approval code: 123456"
 * }
 * 
 * THING 2: Send webhook to your backend (async)
 * POST http://yourserver.com/paystack/webhook
 * Header: x-paystack-signature: [hash]
 * Body: {
 *   "event": "charge.success",
 *   "data": {
 *     "id": 12345678,
 *     "reference": "1704667849123",
 *     "amount": 5000000,
 *     "status": "success",
 *     ...
 *   }
 * }
 */

// ============================================================================
// STAGE 6: FRONTEND - PAYMENT SUCCESSFUL CALLBACK
// ============================================================================

/**
 * 📍 WHAT HAPPENS: Frontend verifies payment with backend
 * 
 * Paystack modal closes and calls onSuccess callback:
 * 
 * const onSuccess = async (reference) => {
 *   // reference = {
 *   //   "status": "success",
 *   //   "reference": "1704667849123",
 *   //   "message": "Approval code: 123456"
 *   // }
 * 
 *   try {
 *     // Step 1: Send verification request to backend
 *     const verifyResponse = await fetch('/api/orders/verify', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'Idempotency-Key': `${orderResult.data.orderId}_${reference.reference}`
 *         // = "42_1704667849123"
 *       },
 *       body: JSON.stringify({
 *         orderId: 42,
 *         reference: "1704667849123"
 *       })
 *     });
 *     
 *     const verifyData = await verifyResponse.json();
 *     
 *     if (verifyData.success) {
 *       // ✓ Payment confirmed!
 *       // Show success page
 *       router.push('/payment-success');
 *       // OR show success toast/modal
 *       showToast('Payment successful!');
 *     } else {
 *       // ✗ Payment failed
 *       showToast('Payment verification failed!');
 *     }
 *   } catch (error) {
 *     console.error('Verification error:', error);
 *     showToast('An error occurred');
 *   }
 * };
 */

// ============================================================================
// STAGE 7: BACKEND - VERIFY PAYMENT ENDPOINT
// ============================================================================

/**
 * 📍 WHAT HAPPENS: Backend verifies payment with Paystack API
 * 
 * Frontend sends:
 * 
 * POST http://localhost:1337/api/orders/verify
 * Headers:
 *   Content-Type: application/json
 *   Idempotency-Key: 42_1704667849123
 * 
 * {
 *   "orderId": 42,
 *   "reference": "1704667849123"
 * }
 * 
 * BACKEND PROCESSING (in order.controller.ts verify method):
 * 
 * 1. Validate request
 *    ✓ orderId provided? Yes (42)
 *    ✓ reference provided? Yes ("1704667849123")
 *    → Validation PASSED
 * 
 * 2. Check Idempotency-Key header
 *    - Key: "42_1704667849123"
 *    - Query transaction_logs table:
 *    - SELECT * FROM transaction_logs
 *      WHERE eventId = "42_1704667849123"
 *      AND status = "success"
 *    - No result found (first time)
 * 
 * 3. Fetch order from database
 *    SELECT * FROM orders WHERE id = 42
 *    Result:
 *    {
 *      id: 42,
 *      reference: "1704667849123",
 *      status: "pending",  ← Still pending!
 *      paid: false,
 *      amount: 5000000,
 *      ...
 *    }
 * 
 * 4. Check if already paid (idempotency)
 *    order.status === "paid"? No (it's "pending")
 *    → Proceed with verification
 * 
 * 5. Call Paystack API to verify
 *    GET https://api.paystack.co/transaction/verify/1704667849123
 *    Headers:
 *      Authorization: Bearer sk_test_1234567890abcdef
 * 
 *    Paystack responds:
 *    {
 *      "status": true,
 *      "message": "Authorization URL created",
 *      "data": {
 *        "id": 12345678,
 *        "reference": "1704667849123",
 *        "amount": 5000000,
 *        "status": "success",
 *        "paid_at": "2024-01-08T10:30:45.000Z",
 *        "customer": {
 *          "email": "chidi@example.com"
 *        }
 *      }
 *    }
 * 
 * 6. Parse Paystack response
 *    Verification successful? YES
 *    verification.success = true
 * 
 * 7. Update order in database
 *    UPDATE orders
 *    SET status = "paid",
 *        paid = true,
 *        transactionId = "12345678"
 *    WHERE id = 42
 * 
 * 8. Log successful verification
 *    INSERT INTO transaction_logs (
 *      orderId: 42,
 *      reference: "1704667849123",
 *      eventType: "verify",
 *      status: "success",
 *      eventId: "42_1704667849123_verify_...",
 *      metadata: { alreadyPaid: false }
 *    )
 * 
 * 9. Return response to frontend
 */

/**
 * RESPONSE from Backend:
 * 
 * HTTP 200 OK
 * Content-Type: application/json
 * 
 * {
 *   "success": true,
 *   "message": "Order verified and paid",
 *   "alreadyPaid": false,
 *   "data": {
 *     "orderId": 42,
 *     "status": "paid",
 *     "paid": true
 *   }
 * }
 * 
 * DATABASE STATE AFTER:
 * 
 * orders table:
 * ├── id: 42
 * ├── reference: "1704667849123"
 * ├── status: "paid"  ← Changed from "pending"!
 * ├── paid: true      ← Changed from false!
 * ├── transactionId: "12345678"
 * └── ...
 * 
 * transaction_logs table (new entry):
 * ├── orderId: 42
 * ├── reference: "1704667849123"
 * ├── eventType: "verify"
 * ├── status: "success"
 * └── ...
 */

/**
 * 🔄 IDEMPOTENCY EXAMPLE - VERIFY:
 * 
 * What if Chidi's browser sent verify request TWICE?
 * (Network hiccup, user clicked verify again, etc.)
 * 
 * Frontend sends same request again:
 * 
 * POST /api/orders/verify
 * {
 *   "orderId": 42,
 *   "reference": "1704667849123"
 * }
 * 
 * Backend processing (2nd time):
 * 1. Validate request ✓
 * 2. Check Idempotency-Key: "42_1704667849123"
 * 3. Query transaction_logs:
 *    SELECT * FROM transaction_logs
 *    WHERE eventId = "42_1704667849123"
 *    AND status = "success"
 *    → FOUND! (from first call)
 * 4. Return cached response immediately
 *    (DON'T query Paystack again)
 *    (DON'T update database again)
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Payment already verified (cached)",
 *   "alreadyPaid": false,
 *   "isIdempotentReplay": true,
 *   "data": {
 *     "orderId": 42,
 *     "status": "paid"
 *   }
 * }
 * 
 * Result: Order updated only ONCE in database! ✓
 */

// ============================================================================
// STAGE 8: PAYSTACK WEBHOOK (ASYNC SAFETY NET)
// ============================================================================

/**
 * 📍 WHAT HAPPENS: Paystack sends webhook to confirm payment
 * 
 * While your frontend is verifying (Stage 7), Paystack also sends webhook:
 * 
 * POST http://yourserver.com/paystack/webhook
 * (This can arrive at any time - before, during, or after Stage 7)
 * 
 * Headers:
 *   x-paystack-signature: 8d8c9c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e
 *   Content-Type: application/json
 * 
 * Body:
 * {
 *   "event": "charge.success",
 *   "data": {
 *     "id": 12345678,
 *     "reference": "1704667849123",
 *     "amount": 5000000,
 *     "status": "success",
 *     "paid_at": "2024-01-08T10:30:45.000Z",
 *     "customer": {
 *       "id": 987654,
 *       "email": "chidi@example.com"
 *     }
 *   }
 * }
 * 
 * BACKEND WEBHOOK PROCESSING (paystack.controller.js):
 * 
 * 1. Validate webhook signature
 *    signature = x-paystack-signature header
 *    body = request body as JSON string
 *    secret = PAYSTACK_SECRET from .env
 *    
 *    Expected hash = HMAC-SHA512(body, secret)
 *    Received hash = signature header
 *    
 *    hash === signature? YES ✓
 *    → Webhook is legitimate (from Paystack, not hacker)
 * 
 * 2. Check if event is "charge.success"
 *    event === "charge.success"? YES ✓
 * 
 * 3. Extract reference
 *    reference = "1704667849123"
 * 
 * 4. Generate unique event ID (idempotency)
 *    eventId = "1704667849123_webhook_12345678"
 * 
 * 5. Check if event already processed
 *    SELECT * FROM transaction_logs
 *    WHERE eventId = "1704667849123_webhook_12345678"
 *    AND status = "success"
 *    
 *    Result? Not found (first webhook)
 * 
 * 6. Find order by reference
 *    SELECT * FROM orders WHERE reference = "1704667849123"
 *    Result:
 *    {
 *      id: 42,
 *      status: "paid",  ← Already paid from Stage 7!
 *      paid: true,
 *      ...
 *    }
 * 
 * 7. Check if already paid (idempotency)
 *    order.status === "paid"? YES
 *    → Skip update (already paid)
 *    → Return success
 * 
 * 8. Log webhook processing
 *    INSERT INTO transaction_logs (
 *      orderId: 42,
 *      reference: "1704667849123",
 *      eventType: "webhook",
 *      status: "success",
 *      eventId: "1704667849123_webhook_12345678",
 *      paystackEvent: "charge.success"
 *    )
 * 
 * 9. Return response
 */

/**
 * RESPONSE to Paystack:
 * 
 * HTTP 200 OK
 * {
 *   "received": true,
 *   "success": true
 * }
 * 
 * (Important: Must return 200 quickly, else Paystack retries)
 */

/**
 * 🔄 WEBHOOK IDEMPOTENCY EXAMPLE:
 * 
 * What if Paystack's webhook arrived TWICE?
 * (Network timeout, Paystack retry mechanism, etc.)
 * 
 * Webhook #1: (arrives first)
 * - Checks transaction_logs: eventId not found
 * - Updates order to paid
 * - Logs successful processing
 * 
 * Webhook #2: (arrives 30 seconds later - Paystack retry)
 * - Checks transaction_logs: eventId FOUND!
 * - Skips order update
 * - Returns success immediately
 * 
 * Result: Order updated only ONCE even though webhook came twice! ✓
 */

// ============================================================================
// STAGE 9: DATABASE STATE - FINAL
// ============================================================================

/**
 * 📍 WHAT'S SAVED IN POSTGRESQL ON RENDER
 * 
 * After entire flow completes:
 * 
 * TABLE: orders
 * ┌─────┬──────────────────┬──────────┬─────────┬────────────────┐
 * │ id  │ reference        │ amount   │ status  │ paid            │
 * ├─────┼──────────────────┼──────────┼─────────┼────────────────┤
 * │ 42  │ 1704667849123    │ 5000000  │ paid    │ true            │
 * └─────┴──────────────────┴──────────┴─────────┴────────────────┘
 * 
 * ┌──────────────────┬────────────────┬────────────────┬───────────────┐
 * │ customerName     │ email          │ phone          │ artworkId     │
 * ├──────────────────┼────────────────┼────────────────┼───────────────┤
 * │ Chidi Okafor     │ chidi@ex.com   │ 08012345678    │ 15            │
 * └──────────────────┴────────────────┴────────────────┴───────────────┘
 * 
 * ┌────────────────┬─────────────────┬──────────────┐
 * │ transactionId  │ failureReason   │ createdAt    │
 * ├────────────────┼─────────────────┼──────────────┤
 * │ 12345678       │ null            │ 2024-01-08   │
 * └────────────────┴─────────────────┴──────────────┘
 * 
 * TABLE: transaction_logs
 * ┌────┬──────────┬──────────────────┬────────┬──────────────────────┐
 * │ id │ orderId  │ reference        │ status │ eventType            │
 * ├────┼──────────┼──────────────────┼────────┼──────────────────────┤
 * │ 1  │ 42       │ 1704667849123    │ ok     │ create               │
 * │ 2  │ 42       │ 1704667849123    │ ok     │ verify               │
 * │ 3  │ 42       │ 1704667849123    │ ok     │ webhook              │
 * └────┴──────────┴──────────────────┴────────┴──────────────────────┘
 * 
 * ACCESSING ON RENDER:
 * 
 * Your Strapi instance on Render uses PostgreSQL:
 * - Connection via Render dashboard
 * - Auto-backups configured
 * - Can query via psql or Strapi admin panel
 * - Accessible at: https://your-strapi.onrender.com/admin/
 */

// ============================================================================
// STAGE 10: FRONTEND - SUCCESS PAGE
// ============================================================================

/**
 * 📍 WHAT HAPPENS: Customer sees success confirmation
 * 
 * After verify endpoint returns success:
 * 
 * Frontend redirects to:
 * 
 * /payment-success
 * 
 * Shows:
 * ┌──────────────────────────────────────┐
 * │  ✓ PAYMENT SUCCESSFUL                │
 * │                                      │
 * │  Order ID: #42                       │
 * │  Amount: ₦50,000                    │
 * │  Reference: 1704667849123          │
 * │                                      │
 * │  Thank you for your purchase!       │
 * │  Your artwork will be delivered to: │
 * │  chidi@example.com                  │
 * │                                      │
 * │  [Download Receipt] [Go to Gallery] │
 * └──────────────────────────────────────┘
 * 
 * You might also want to:
 * - Send confirmation email
 * - Update artwork ownership in database
 * - Start delivery process
 * - Add to customer's collection
 */

// ============================================================================
// STAGE 11: ERROR SCENARIOS
// ============================================================================

/**
 * 📍 WHAT IF: Payment failed?
 * 
 * Scenario: Chidi's card was declined
 * 
 * Paystack returns to frontend:
 * {
 *   "status": "failed",
 *   "reference": "1704667849123",
 *   "message": "Insufficient funds"
 * }
 * 
 * Frontend onClose callback fires:
 * 
 * const onClose = () => {
 *   // User closed modal or payment failed
 *   showToast('Payment was not completed');
 *   // Order stays in "pending" status
 *   // User can try again with same reference
 * }
 */

/**
 * 📍 WHAT IF: Backend is unreachable during verify?
 * 
 * Scenario: Network error when calling /api/orders/verify
 * 
 * Frontend catch block:
 * 
 * catch (error) {
 *   console.error('Verification error:', error);
 *   showToast('Could not verify. Your payment may still succeed.');
 *   // Order is already paid (Paystack confirmed)
 *   // Webhook will update it shortly
 * }
 * 
 * What happens:
 * 1. Order was created ✓
 * 2. Payment succeeded at Paystack ✓
 * 3. Frontend couldn't verify (network issue)
 * 4. Paystack webhook arrives anyway ✓
 * 5. Order updated to paid ✓
 * 
 * Result: No data loss! Webhook is the safety net.
 */

/**
 * 📍 WHAT IF: Invalid amount or reference?
 * 
 * POST /api/orders/create
 * {
 *   "reference": null,  ← Missing!
 *   "amount": 0,        ← Invalid!
 * }
 * 
 * Backend response:
 * 
 * HTTP 400 Bad Request
 * {
 *   "success": false,
 *   "message": "Missing required fields: reference, amount, customerName, email"
 * }
 * 
 * Frontend handling:
 * 
 * if (!orderResponse.ok) {
 *   const error = await orderResponse.json();
 *   showToast(error.message);
 *   // Don't proceed to Paystack
 * }
 */

// ============================================================================
// SUMMARY - DATA FLOW DIAGRAM
// ============================================================================

/**
 * 🔄 COMPLETE PAYMENT FLOW:
 * 
 * CUSTOMER (Browser)          BACKEND (Strapi)           PAYSTACK API        DATABASE (PostgreSQL)
 * │                           │                          │                    │
 * ├─ Fill form                │                          │                    │
 * │                           │                          │                    │
 * ├─ POST /orders/create ─────>                          │                    │
 * │                           ├─ Create order ───────────────────────────────>│
 * │                           │                          │                    │
 * │<────── Order #42 ─────────┤                          │                    │
 * │                           │                          │                    │
 * ├─ Show Paystack modal      │                          │                    │
 * │                           │                          │                    │
 * ├─ Enter card details       │                          │                    │
 * │                           │                          │                    │
 * ├─ Click Pay ───────────────────────────────────────────> Process card     │
 * │                           │                          │                    │
 * │<─────── Success ───────────────────────────────────────┤                  │
 * │                           │                          │                    │
 * ├─ POST /orders/verify ────>                          │                    │
 * │                           ├─ Call Verify API ────────> Verify            │
 * │                           │<──── Confirmed ──────────┤                    │
 * │                           ├─ Update order ──────────────────────────────>│
 * │<─ Success response ───────┤                          │                    │
 * │                           │                          │                    │
 * │ [Later] Webhook           │                          │                    │
 * │           ├────────────────────────────────────────────> charge.success  │
 * │           │<──── Signature validation ───────┤       │                    │
 * │           │                           │      │       │                    │
 * │           │                           ├─ Log event ──────────────────────>│
 * │           │<─── 200 OK ────────────────┤              │                    │
 * │                           │                          │                    │
 * └─ Show success page        │                          │                    │
 */

// ============================================================================
// FRONTEND DEVELOPER CHECKLIST
// ============================================================================

/**
 * ✓ WHAT FRONTEND DEVELOPERS NEED TO UPDATE:
 * 
 * 1. ENVIRONMENT VARIABLES
 *    Add to .env.local:
 *    NEXT_PUBLIC_PAYSTACK_KEY=pk_test_xxxxx
 *    (Public key is safe to expose to frontend)
 * 
 * 2. UPDATE useBuyArtwork.ts HOOK
 *    
 *    Before (old way):
 *    const config = {
 *      reference: new Date().getTime().toString(),
 *      email: email,
 *      amount: artwork.price * 100,
 *      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
 *      metadata: {
 *        artwork_id: artwork.id,
 *        customer_name: firstName + ' ' + lastName,
 *        phone: phone
 *      }
 *    };
 * 
 *    After (new way):
 *    // Step 1: Create order first
 *    const orderResponse = await fetch('/api/orders/create', {
 *      method: 'POST',
 *      headers: { 'Content-Type': 'application/json' },
 *      body: JSON.stringify({
 *        reference: new Date().getTime().toString(),
 *        amount: artwork.price * 100,
 *        customerName: firstName + ' ' + lastName,
 *        email: email,
 *        phone: phone,
 *        artworkId: artwork.id
 *      })
 *    });
 * 
 *    const orderResult = await orderResponse.json();
 * 
 *    // Step 2: Use orderId in metadata
 *    const config = {
 *      reference: orderResult.data.reference,
 *      email: email,
 *      amount: orderResult.data.amount,
 *      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
 *      metadata: {
 *        orderId: orderResult.data.orderId,  // ← NEW!
 *        artworkId: artwork.id,
 *        customerName: firstName + ' ' + lastName
 *      }
 *    };
 * 
 * 3. UPDATE onSuccess CALLBACK
 *    
 *    Before:
 *    const onSuccess = (reference) => {
 *      console.log('Payment successful!');
 *      // No backend verification
 *    }
 * 
 *    After:
 *    const onSuccess = async (reference) => {
 *      try {
 *        const verifyResponse = await fetch('/api/orders/verify', {
 *          method: 'POST',
 *          headers: {
 *            'Content-Type': 'application/json',
 *            'Idempotency-Key': `${orderResult.data.orderId}_${reference.reference}`
 *          },
 *          body: JSON.stringify({
 *            orderId: orderResult.data.orderId,
 *            reference: reference.reference
 *          })
 *        });
 * 
 *        const verifyData = await verifyResponse.json();
 * 
 *        if (verifyData.success) {
 *          // Payment verified!
 *          router.push('/payment-success');
 *          showToast('Payment successful!');
 *        } else {
 *          showToast('Payment verification failed!');
 *        }
 *      } catch (error) {
 *        console.error('Verification error:', error);
 *        showToast('An error occurred. Please contact support.');
 *      }
 *    };
 * 
 * 4. UPDATE PaymentModal COMPONENT
 *    
 *    Make sure to collect these fields:
 *    - First Name (for customerName)
 *    - Last Name (for customerName)
 *    - Email (required)
 *    - Phone (required)
 *    
 *    Before submitting, combine firstName + lastName into customerName
 * 
 * 5. ADD ERROR HANDLING
 *    
 *    Handle these cases:
 *    - Network error when creating order
 *    - Invalid form fields
 *    - Paystack payment cancelled
 *    - Verification failed
 *    - Timeout during verification
 * 
 * 6. ADD LOADING STATES
 *    
 *    Show loader:
 *    - While creating order
 *    - While Paystack is processing
 *    - While verifying payment
 *    
 *    UI Flow:
 *    [Fill Form] → [Creating Order...] → [Paystack Modal] → [Verifying...] → [Success]
 */

// ============================================================================
// BACKEND DEVELOPER CHECKLIST
// ============================================================================

/**
 * ✓ WHAT BACKEND DEVELOPERS ALREADY HAVE:
 * 
 * 1. ✓ Order Schema Enhanced
 *    - Added: status, customerName, email, phone, artworkId, transactionId, failureReason
 *    - Made reference unique
 * 
 * 2. ✓ Transaction-Log Model Created
 *    - Tracks all payment operations
 *    - Enables idempotency
 *    - Provides audit trail
 * 
 * 3. ✓ Order Service Methods
 *    - createOrderIdempotent()
 *    - verifyPaymentIdempotent()
 *    - updatePaymentStatusFromWebhook()
 * 
 * 4. ✓ Order Controller Endpoints
 *    - POST /api/orders/create
 *    - POST /api/orders/verify
 *    - POST /api/orders/legacy-verify (backward compat)
 * 
 * 5. ✓ Paystack Service
 *    - Paystack API calls
 *    - Webhook signature validation
 *    - Event deduplication
 *    - Transaction logging
 * 
 * 6. ✓ Paystack Controller Webhook
 *    - Idempotent webhook handling
 *    - Signature verification
 *    - Event tracking
 * 
 * WHAT TO TEST:
 * 
 * 1. Test order creation
 *    POST /api/orders/create with valid data
 *    → Should return order with ID
 * 
 * 2. Test idempotency on create
 *    POST /api/orders/create with same reference twice
 *    → Should return same order ID both times
 * 
 * 3. Test payment verification
 *    POST /api/orders/verify with Paystack reference
 *    → Should verify with Paystack API
 *    → Should update order status to "paid"
 * 
 * 4. Test idempotency on verify
 *    POST /api/orders/verify twice with same data
 *    → Should return success both times
 *    → Should only call Paystack once
 * 
 * 5. Test webhook idempotency
 *    Send same webhook twice
 *    → Both should return 200 OK
 *    → Order should update only once
 * 
 * 6. Test with Paystack test keys
 *    Use test card: 4111111111111111
 *    Should complete payment flow successfully
 */

// ============================================================================
// DEPLOYMENT CHECKLIST
// ============================================================================

/**
 * ✓ BEFORE GOING TO PRODUCTION:
 * 
 * 1. Get Paystack LIVE keys
 *    - Go to paystack.com → Settings → API Keys
 *    - Get LIVE keys (sk_live_xxx, pk_live_xxx)
 *    - ⚠️ NEVER commit to GitHub!
 * 
 * 2. Update environment variables on Render
 *    - Strapi Backend:
 *      PAYSTACK_SECRET=sk_live_xxxxx
 *      (Set in Render dashboard → Environment → Add Variable)
 *    
 *    - Next.js Frontend:
 *      NEXT_PUBLIC_PAYSTACK_KEY=pk_live_xxxxx
 *      (Set in Vercel/Netlify dashboard)
 * 
 * 3. Configure Paystack Webhook on Dashboard
 *    - Go to paystack.com → Settings → Webhooks
 *    - Add webhook URL:
 *      https://your-strapi.onrender.com/paystack/webhook
 *    - Test webhook delivery
 * 
 * 4. Test full flow in LIVE mode
 *    - Create test transaction with real Paystack account
 *    - Verify order is created in database
 *    - Verify payment is confirmed
 *    - Check transaction logs for audit trail
 * 
 * 5. Set up monitoring
 *    - Monitor /paystack/webhook endpoint
 *    - Set up alerts for payment failures
 *    - Regular database backups (Render auto-does this)
 *    - Monitor Paystack dashboard for issues
 * 
 * 6. Documentation
 *    - Share this guide with team
 *    - Document API endpoints
 *    - Create runbook for support team
 *    - Add error handling procedures
 */

// ============================================================================
// REAL-WORLD EDGE CASES & SOLUTIONS
// ============================================================================

/**
 * 📍 EDGE CASE 1: Network timeout during order creation
 * 
 * What happens:
 * Frontend sends POST /api/orders/create
 * Network disconnects before response arrives
 * Frontend retries (or user clicks again)
 * 
 * Backend handling:
 * First attempt: Creates order #42
 * Second attempt: Finds order #42 with same reference
 * Returns same order (idempotent)
 * 
 * Result: One order, frontend recovers gracefully ✓
 */

/**
 * 📍 EDGE CASE 2: Browser tab closed during payment
 * 
 * What happens:
 * User closes browser after Paystack modal shows
 * Payment might still go through at Paystack
 * 
 * Solution:
 * 1. Backend receives webhook from Paystack
 * 2. Updates order to "paid" even without frontend verification
 * 3. Next time user logs in, they see payment was processed
 * 
 * Result: No lost payments ✓
 */

/**
 * 📍 EDGE CASE 3: Webhook arrives before verification
 * 
 * What happens:
 * Paystack webhook processes faster than frontend verification
 * 
 * Timeline:
 * T1: Frontend calls POST /orders/verify
 * T2: Paystack webhook arrives (T2 < T1)
 * T2: Webhook updates order to "paid"
 * T3: Verify request arrives, finds order already paid
 * 
 * Backend handling:
 * At T3, order.status === "paid"
 * Verify returns: alreadyPaid: true
 * Frontend shows success
 * 
 * Result: Correct outcome, no confusion ✓
 */

/**
 * 📍 EDGE CASE 4: Partial payment (rare but possible)
 * 
 * What if Paystack API partially fails?
 * 
 * Solution already in place:
 * 1. Try-catch blocks around all API calls
 * 2. Transaction logs record errors
 * 3. Status field allows "failed" state
 * 4. Idempotency prevents duplicate attempts
 * 
 * If payment fails:
 * - Order stays in "pending"
 * - User can retry
 * - No duplicate charges
 */

/**
 * 📍 EDGE CASE 5: Amount mismatch
 * 
 * What if hacker tries:
 * POST /api/orders/create
 * {
 *   "reference": "1704667849123",
 *   "amount": 100  ← Changed from 5000000!
 * }
 * 
 * Current implementation:
 * - Backend creates order with amount: 100
 * - Frontend initializes Paystack with amount: 5000000 (original artwork price)
 * - User pays 5000000 at Paystack
 * - Verification compares amounts
 * 
 * Improvement you should consider:
 * - Add amount validation in verify endpoint
 * - Compare with artwork actual price
 * - Reject if mismatch
 * 
 * Example:
 * async verify(ctx) {
 *   // ... existing code ...
 *   
 *   // Get artwork price
 *   const artwork = await strapi.entityService.findOne(
 *     'api::artwork.artwork',
 *     order.artworkId
 *   );
 *   
 *   // Verify amount matches
 *   if (verification.data.amount !== artwork.price * 100) {
 *     return ctx.badRequest('Amount mismatch');
 *   }
 *   
 *   // ... rest of code ...
 * }
 */

// ============================================================================
// MONITORING & DEBUGGING
// ============================================================================

/**
 * 📍 HOW TO DEBUG PAYMENT ISSUES:
 * 
 * 1. Check Paystack Dashboard
 *    - Go to paystack.com → Transactions
 *    - Search by reference or email
 *    - See if payment was actually received
 * 
 * 2. Check Strapi Admin Panel
 *    - Content Manager → Orders
 *    - Filter by customer email
 *    - Check status, reference, transactionId
 * 
 * 3. Check Transaction Logs
 *    - Content Manager → Transaction Logs
 *    - Filter by orderId
 *    - See exact timestamp of each event
 *    - Check metadata and error messages
 * 
 * 4. Check Server Logs
 *    - Render dashboard → Logs
 *    - Look for error messages
 *    - Check webhook delivery logs
 *    - Verify API calls were made
 * 
 * 5. Test with Paystack Test Keys
 *    Test card: 4111111111111111
 *    Expiry: Any future date
 *    CVV: Any 3 digits
 *    OTP: 123456
 * 
 * 6. Common issues & solutions:
 * 
 *    Issue: "PAYSTACK_SECRET not defined"
 *    Solution: Check .env file, restart Strapi
 * 
 *    Issue: "Invalid signature"
 *    Solution: Webhook signature validation failed
 *             Check if PAYSTACK_SECRET matches
 *             Check webhook body hasn't been modified
 * 
 *    Issue: "Order not found"
 *    Solution: Reference might be different format
 *             Check database for exact reference value
 * 
 *    Issue: "Duplicate webhook processing"
 *    Solution: eventId tracking should prevent this
 *             Check transaction_logs for eventId
 */

// ============================================================================
// PERFORMANCE TIPS
// ============================================================================

/**
 * 📍 OPTIMIZE PAYMENT FLOW:
 * 
 * 1. Parallel requests
 *    Instead of:
 *    - Create order
 *    - Then initialize Paystack
 *    
 *    Consider:
 *    - Create order in background
 *    - Show Paystack immediately
 *    - Verify after payment
 * 
 * 2. Cache Paystack key
 *    Already in .env variable - good!
 *    Don't make API calls to fetch it
 * 
 * 3. Batch verification
 *    If many orders created:
 *    - Don't verify each individually
 *    - Can batch verify with Paystack API
 *    - Process in background jobs
 * 
 * 4. Reduce database queries
 *    Current flow is efficient:
 *    - Create: 1 query
 *    - Verify: 1-2 queries
 *    - Webhook: 1-2 queries
 *    
 *    Could optimize with caching:
 *    - Cache artwork prices
 *    - Cache customer data
 * 
 * 5. Rate limiting
 *    Consider adding:
 *    - Limit create orders per IP
 *    - Limit verify per order
 *    - Prevent spam/attack
 */
