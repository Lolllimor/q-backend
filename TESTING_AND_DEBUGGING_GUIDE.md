# Payment Flow Testing & Debugging Guide

## 🎯 Quick Answer to Your Questions

### Q1: Why is idempotency not working on create order?

**Your Findings:**
- First request: Proper response `{success: true, isNew: true, data: {...}}`
- Second request with same reference: Echoes request body (WRONG)

**Root Cause:** Core CRUD router was interfering with custom `/orders/create` route

**FIX APPLIED:** Modified `src/api/order/routes/order.ts` to disable POST/PUT/DELETE:
```typescript
export default factories.createCoreRouter('api::order.order', {
  only: ['find', 'findOne'],  // Only GET routes
});
```

**Expected After Fix:**
- First request: `{success: true, isNew: true}`
- Second request (same ref): `{success: true, isNew: false}` ← Returns existing order

---

### Q2: Why did redirect go to callback_url instead of webhook URL?

**Your Confusion:**
- You expected Paystack to send redirect to webhook URL from dashboard
- But it redirected to the `callback_url` you provided in initialization

**The Answer:** They serve DIFFERENT purposes

| | Callback URL | Webhook URL |
|---|---|---|
| **What?** | Browser redirect | Server-to-server notification |
| **When?** | Immediately after payment | Asynchronously after payment |
| **Visible in?** | Browser location bar | Backend logs only |
| **From Paystack?** | To customer's browser | To your server |
| **Your config** | In `initialize` call | In Paystack dashboard |
| **Example** | `http://localhost:3000/payment-success?ref=...` | `https://q-backend-92vd.onrender.com/paystack/webhook` |

**You Did It Correctly!** The redirect was supposed to go to callback_url.

---

### Q3: Is transaction being stored in database?

**Answer:** YES - but only what you've tested

**What's Logged:**
- ✅ When `/api/orders/create` called → Logged as "create" event
- ✅ When `/api/orders/verify` called → Logged as "verify" event
- ⏳ When webhook received → Logged as "webhook" event (NOT YET TESTED)

**How to Verify:**

In Postman, hit:
```
GET {{base_url}}/api/transaction-logs?filters[orderId]=20
```

Should return something like:
```json
{
  "data": [
    {
      "id": 1,
      "orderId": 20,
      "reference": "QUADMORE_1767973687",
      "eventType": "create",
      "status": "success",
      "eventId": "QUADMORE_1767973687_create_1704856234567",
      "createdAt": "2024-01-09T12:30:00.000Z"
    },
    {
      "id": 2,
      "orderId": 20,
      "reference": "QUADMORE_1767973687",
      "eventType": "verify",
      "status": "success",
      "eventId": "QUADMORE_1767973687_verify_1704856234600",
      "createdAt": "2024-01-09T12:35:00.000Z"
    }
  ]
}
```

---

## 📊 YOUR COMPLETE FLOW (Corrected)

```
TIMELINE:

12:30:00 - Create Order (POST /api/orders/create)
          └─ Response: orderId=20, status=pending
          └─ DB: Order inserted
          └─ Logs: Transaction created (event: "create")

12:30:15 - Initialize Paystack (Frontend POST /transaction/initialize)
          └─ Response: authorization_url
          └─ No DB change
          └─ No logs

12:30:30 - Customer Pays (Browser)
          └─ Paystack processes charge
          └─ No immediate response

12:30:35 - Paystack Redirect (Automatic)
          └─ Browser redirects to: http://localhost:3000/payment-success?ref=...
          └─ Frontend receives ref in URL

12:31:00 - Verify Payment (POST /api/orders/verify)
          └─ Backend calls Paystack API
          └─ Paystack confirms: "Yes, this payment is successful"
          └─ DB: Order.status changed from "pending" → "paid"
          └─ Logs: Transaction created (event: "verify")
          └─ Response: {success: true, status: "paid"}

12:31:05 - Webhook (Async, Server-to-Server)
          └─ Paystack calls: POST /paystack/webhook
          └─ Backend logs transaction (event: "webhook")
          └─ DB: Verifies order is still paid
          └─ Response: 200 OK (Paystack sees this)
          └─ NOTE: You can't see this in browser!
```

---

## ✅ Complete Testing Checklist

### Part 1: Test Idempotency (Do This First)

**Setup:**
1. Make sure Strapi is running
2. Open Postman
3. Use environment with base_url = http://localhost:1337

**Test Steps:**

1. **First Request:**
   ```
   POST http://localhost:1337/api/orders/create
   
   Body:
   {
     "amount": 10000,
     "customerName": "Test User",
     "email": "test@example.com",
     "phone": "2348012345678",
     "artworkId": 1,
     "reference": "TEST_IDEM_001"
   }
   ```
   
   Expected Response:
   ```json
   {
     "success": true,
     "message": "Order created successfully",
     "isNew": true,
     "data": {
       "orderId": 25,
       "reference": "TEST_IDEM_001",
       "status": "pending"
     }
   }
   ```
   
   ✅ **Save** orderId to environment: `order_id = 25`

2. **Second Request (SAME reference):**
   ```
   POST http://localhost:1337/api/orders/create
   
   Body:
   {
     "amount": 10000,
     "customerName": "Test User",
     "email": "test@example.com",
     "phone": "2348012345678",
     "artworkId": 1,
     "reference": "TEST_IDEM_001"
   }
   ```
   
   Expected Response:
   ```json
   {
     "success": true,
     "message": "Order already exists",
     "isNew": false,
     "data": {
       "orderId": 25,
       "reference": "TEST_IDEM_001",
       "status": "pending"
     }
   }
   ```
   
   ✅ **Verify:** Same orderId (25), isNew is false, no error

3. **Check Terminal Logs:**
   
   You should see:
   ```
   🔵 CREATE ORDER ENDPOINT CALLED
     Reference: TEST_IDEM_001
     Amount: 10000
     Customer: Test User
     ✓ Calling createOrderIdempotent service...
     ✓ Order result: { isNew: false, orderId: 25 }
     ✓ Transaction logged
     ✓ RESPONSE: { success: true, message: "Order already exists", isNew: false, ... }
   ```

---

### Part 2: Test Transaction Logging

**Prerequisites:** Complete Part 1 (have orderId=25)

1. **Verify Transaction Was Logged:**
   ```
   GET http://localhost:1337/api/transaction-logs?filters[orderId]=25
   ```
   
   Expected: At least 2 entries
   - One with eventType: "create"
   - One with eventType: "create" (from the second request)

2. **Or in Strapi Admin:**
   - Go to http://localhost:1337/admin
   - Click Content Manager → Transaction Logs
   - Filter by orderId = 25
   - Should see entries for both requests

---

### Part 3: Test Verify Endpoint

**Prerequisites:** Have an order with a successful Paystack payment

1. **Create New Order:**
   ```
   POST /api/orders/create
   
   Body:
   {
     "amount": 5000,
     "customerName": "Verify Test",
     "email": "verify@example.com",
     "reference": "VERIFY_TEST_{{$timestamp}}"
   }
   ```
   
   Response: Note orderId (e.g., 26) and reference

2. **Complete Payment on Paystack:**
   - Use test card: 4111111111111111
   - Go to initialization URL from your code
   - Complete payment
   - Paystack will redirect to your callback_url

3. **Call Verify Endpoint:**
   ```
   POST http://localhost:1337/api/orders/verify
   
   Body:
   {
     "orderId": 26,
     "reference": "VERIFY_TEST_1704856234567"
   }
   ```
   
   Expected Response:
   ```json
   {
     "success": true,
     "message": "Order verified and paid",
     "alreadyPaid": false,
     "data": {
       "orderId": 26,
       "status": "paid",
       "paid": true
     }
   }
   ```

4. **Verify Transaction Logged:**
   ```
   GET http://localhost:1337/api/transaction-logs?filters[orderId]=26
   ```
   
   Should show "verify" event

---

### Part 4: Test Webhook (Production Only)

**Note:** Webhooks can only be tested in production because Paystack can't reach localhost

**Prerequisites:** 
- Deployed to Render (not localhost)
- Webhook URL configured in Paystack dashboard

**Steps:**
1. Go to Paystack Dashboard → Settings → Webhooks
2. Find your webhook URL
3. Click "Send test event"
4. Check Strapi logs: Should see webhook processed
5. In database: Should see "webhook" transaction logged

---

## 🔧 Debug Checklist

If something isn't working:

### Create Order Returns Weird Response

- [ ] Check terminal logs for "🔵 CREATE ORDER ENDPOINT CALLED"
- [ ] Verify route is pointing to correct handler
- [ ] Check if core route is interfering (should be disabled now)

### Transaction Not Logged

- [ ] Verify PAYSTACK_SECRET is in .env
- [ ] Check terminal for error messages
- [ ] Try hitting transaction-logs endpoint manually

### Verify Returns 500 Error

- [ ] Check orderId is correct (exists in database)
- [ ] Verify reference matches the order
- [ ] Check Paystack test keys are correct
- [ ] Look at terminal logs for error details

### Webhook Not Received

- [ ] Webhook URL should be production (not localhost)
- [ ] URL should be in Paystack dashboard settings
- [ ] Check Strapi logs for webhook delivery
- [ ] Try "Send test event" in Paystack dashboard

---

## 📱 Example Test Scenario

**Goal:** Test complete flow with idempotency

**Steps:**

1. **Create Order:**
   ```json
   POST /api/orders/create
   {
     "amount": 20000,
     "customerName": "Oke Test",
     "email": "oke@test.com",
     "reference": "OKE_TEST_{{$timestamp}}"
   }
   ```
   Response: orderId = 30, reference = OKE_TEST_1704856234567

2. **Create Same Order Again (Idempotency Check):**
   ```json
   POST /api/orders/create
   {
     "amount": 20000,
     "customerName": "Oke Test",
     "email": "oke@test.com",
     "reference": "OKE_TEST_1704856234567"
   }
   ```
   Response: SAME orderId = 30, but isNew = false

3. **Initialize Paystack:**
   ```json
   POST https://api.paystack.co/transaction/initialize
   {
     "email": "oke@test.com",
     "amount": 2000000,
     "reference": "OKE_TEST_1704856234567",
     "callback_url": "http://localhost:3000/payment-success"
   }
   ```

4. **Pay with Test Card:**
   - Open authorization_url
   - Use card: 4111111111111111
   - Complete payment
   - Get redirected to http://localhost:3000/payment-success?ref=OKE_TEST_1704856234567

5. **Verify Payment:**
   ```json
   POST /api/orders/verify
   {
     "orderId": 30,
     "reference": "OKE_TEST_1704856234567"
   }
   ```
   Response: status = "paid"

6. **Check Transaction Logs:**
   ```
   GET /api/transaction-logs?filters[orderId]=30
   ```
   Should see 3 entries:
   - create (from step 1)
   - create (from step 2 - idempotent replay)
   - verify (from step 5)

---

## 📝 Next Steps

1. **Verify fix works:**
   - Test idempotency (Part 1 above)
   - Check terminal logs show correct messages
   - Confirm second request returns isNew: false

2. **Configure webhook:**
   - Get production URL from Render
   - Add to Paystack dashboard
   - Test webhook delivery

3. **Test complete flow:**
   - Follow "Example Test Scenario" above
   - Verify all database entries

4. **Prepare frontend:**
   - Update callback_url to use environment variables
   - Share FRONTEND_INTEGRATION_GUIDE.md with team
   - Implement the 3-step flow (create → initialize → verify)

---

## 📞 Support

If something isn't working:

1. Check the "Debug Checklist" section above
2. Share terminal logs from Strapi
3. Share Postman request/response
4. Share relevant .env variables (without secrets!)
5. Share database state (transaction logs for that order)

