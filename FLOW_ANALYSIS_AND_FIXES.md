# Complete Payment Flow Analysis & Fixes

## Your Current Flow (With Issues Identified)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    YOUR PAYMENT FLOW (What You Did)                     │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Create Order (Backend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  POST {{base_url}}/api/orders/create

  Request:
  {
    "amount": 20000,
    "customerName": "Oke Olamide",
    "email": "ola@yopmail.com",
    "phone": "2348012345678",
    "artworkId": 4,
    "reference": "QUADMORE_1767973687"
  }

  ✅ Response 1 (First call):
  {
    "success": true,
    "message": "Order created successfully",
    "isNew": true,
    "data": {
      "orderId": 20,
      "reference": "QUADMORE_1767973687",
      "status": "pending"
    }
  }

  ❌ Response 2 (Second call - WRONG):
  {
    "amount": 20000,
    "customerName": "Oke Olamide",
    "email": "ola@yopmail.com",
    ...  // Just echoes body - NOT idempotent!
  }

  📌 ISSUE: Idempotency not working. Second call should return the existing order,
     not echo the request body.
  
  📊 Database State: Order created in orders table
  └─ ID: 20, Reference: "QUADMORE_1767973687", Status: "pending"


STEP 2: Initialize Payment on Paystack (Frontend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  POST https://api.paystack.co/transaction/initialize
  
  Headers:
  {
    "Authorization": "Bearer sk_test_YOUR_KEY"
  }

  Request:
  {
    "email": "ola@yopmail.com",
    "amount": 2000000,                    // Amount in KOBO (20000 NGN)
    "reference": "QUADMORE_1767973687",  // MUST match order reference!
    "callback_url": "http://localhost:3000/payment-success"
  }

  ✅ Response:
  {
    "status": true,
    "data": {
      "authorization_url": "https://checkout.paystack.com/sn63cy6w5v6tpny",
      "access_code": "sn63cy6w5v6tpny",
      "reference": "QUADMORE_1767973687"
    }
  }

  📌 KEY POINTS:
     • This is a FRONTEND operation (from your Next.js app)
     • Amount must be in KOBO (₦ × 100)
     • Reference MUST match your order reference
     • callback_url is where customer redirects after payment
     • This is NOT a Paystack webhook - it's an API call


STEP 3: Customer Completes Payment (Browser)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Frontend opens Paystack checkout: https://checkout.paystack.com/sn63cy6w5v6tpny
  2. Customer enters card: 4111111111111111
  3. Customer completes payment
  4. Paystack processes charge (backend)
  5. Customer redirected to callback_url with query params

  ✅ Redirect URL:
  http://localhost:3000/payment-success?trxref=QUADMORE_1767973687&reference=QUADMORE_1767973687
  
  📌 THIS IS CORRECT! The redirect URL has your reference as query param


STEP 4: Verify Payment (Frontend → Backend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  POST {{base_url}}/api/orders/verify

  Request:
  {
    "orderId": 20,
    "reference": "QUADMORE_1767973687"
  }

  ✅ Response:
  {
    "success": true,
    "message": "Order verified and paid",
    "alreadyPaid": false,
    "data": {
      "orderId": 23,
      "status": "paid",
      "paid": true
    }
  }

  📌 What happens inside:
     1. Backend calls Paystack API to verify
     2. Paystack confirms: "Yes, payment successful"
     3. Order status changed from "pending" → "paid"
     4. Transaction logged for audit trail


STEP 5: Webhook (Async - From Paystack)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  POST {{base_url}}/paystack/webhook
  
  ⚠️ THIS HAPPENS AUTOMATICALLY (you don't manually trigger it)
  ⚠️ Paystack sends this server-to-server (you can't see it in browser)
  
  Paystack sends:
  {
    "event": "charge.success",
    "data": {
      "id": 1234567890,
      "reference": "QUADMORE_1767973687",
      "amount": 2000000,
      "status": "success",
      "customer": { "email": "ola@yopmail.com" }
    }
  }
  
  Response (Always 200 OK):
  {
    "status": "success",
    "message": "Event processed successfully"
  }
```

---

## 🔴 Issues You're Experiencing

### Issue #1: Create Order NOT Idempotent (CRITICAL)

**Symptom:** Second request with same reference echoes request body instead of returning existing order

**Root Cause:** Possible route conflict with core CRUD router. Your custom POST `/orders/create` might be getting intercepted.

**Impact:** 
- ❌ No idempotency protection
- ❌ Could create duplicate orders
- ❌ Frontend can't safely retry on network timeout

**Fix:** Disable core routes for orders or ensure custom routes match first

---

### Issue #2: Redirect vs Webhook Confusion (IMPORTANT)

**You thought:** The redirect would go to the webhook URL in your Paystack dashboard

**Actually:**
- **Redirect (callback_url)** = Where the CUSTOMER browser goes after payment
  - Browser redirect (you can see it in browser)
  - Sent to the `callback_url` in Paystack initialize
  - User-facing, immediate
  
- **Webhook** = Where Paystack tells YOUR SERVER about payment
  - Server-to-server (you can't see in browser)
  - Sent to webhook URL in Paystack dashboard settings
  - Async, delayed, acts as safety net
  - Can retry if your server doesn't acknowledge

**The callback_url you used** → `http://localhost:3000/payment-success`
**The webhook URL in dashboard** → Should be something like `https://q-backend.onrender.com/paystack/webhook`

---

### Issue #3: Transaction Logging

**Your question:** Is the transaction being stored in the database?

**Answer:** YES, but only for successful operations
- Transaction logged when verify endpoint called (✅ You verified)
- Transaction logged when webhook processed (⏳ You haven't confirmed)
- Check: Go to Strapi admin → Transaction Logs collection

---

## ✅ Correct Complete Flow (Fixed)

```
FRONTEND (Next.js)                  BACKEND (Strapi)              PAYSTACK
    │                                   │                            │
    │ 1. GET /api/orders/create         │                            │
    ├──────────────────────────────────>│                            │
    │                                   │ Create order               │
    │                                   │ (pending status)           │
    │   2. Response: orderId, ref       │                            │
    │<──────────────────────────────────┤                            │
    │                                   │                            │
    │ 3. Initialize payment (POST /transaction/initialize)           │
    ├────────────────────────────────────────────────────────────────>│
    │                                   │                            │
    │   4. Response: authorization_url  │                            │
    │<────────────────────────────────────────────────────────────────┤
    │                                   │                            │
    │ 5. Open Paystack modal/page       │                            │
    │ https://checkout.paystack.com/... │                            │
    │ (Customer enters card)            │                            │
    │                                   │                            │
    │ 6. Payment successful             │                            │
    │ (automatic webhook sent)          │                            │
    │                                   │                      🔔 Webhook
    │                                   │                      (async)
    │ 7. Redirect to callback_url       │                            │
    │ /payment-success?ref=...          │                            │
    │                                   │                            │
    │ 8. Verify payment (POST verify)   │                            │
    ├──────────────────────────────────>│ Verify with Paystack       │
    │                                   ├────────────────────────────>│
    │                                   │ Confirm status             │
    │                                   │<────────────────────────────┤
    │   9. Response: paid=true          │ Update order to "paid"     │
    │<──────────────────────────────────┤                            │
    │                                   │                            │
    │ 10. Show success page             │                            │
    │                                   │                            │
    │ ⏳ Webhook (server-to-server)     │                            │
    │                                   │<────────────────────────────┤
    │                                   │ Double-check payment       │
    │                                   │ Log transaction            │
    │ (SILENT - no browser redirect)    │                            │
    │                                   │                            │
```

---

## 🔧 What Needs to Be Fixed

### Fix #1: Ensure Create Order Idempotency Works

**Current behavior:** Second request with same reference echoes body

**Expected behavior:** Return existing order with `isNew: false`

**Action:** Test by adding this debug code to controller:

```typescript
console.log('Create endpoint called');
console.log('Reference:', reference);
console.log('Existing check about to run...');

const existingOrder = await strapi.entityService.findMany('api::order.order', {
  filters: { reference: orderData.reference },
  limit: 1,
});

console.log('Existing order found?', existingOrder.length > 0);
```

Then check terminal logs to see where it's failing.

---

### Fix #2: Understand Webhook Configuration

**You need to:**
1. Go to paystack.com → Settings → Webhooks (or API Keys & Webhooks)
2. Set webhook URL to: `https://q-backend.onrender.com/paystack/webhook`
   - ⚠️ NOT localhost (Paystack can't reach localhost)
   - Must be your live Render URL
   - Must match the URL in your code

**Test webhook delivery:**
1. In Paystack dashboard, click "Send test webhook"
2. Check your Strapi logs to see if it arrives
3. Verify order status updated in database

---

### Fix #3: Transaction Logging Verification

**To confirm transactions are being logged:**

1. **In Postman, hit:**
   ```
   GET {{base_url}}/api/transaction-logs?filters[orderId]=20
   ```

2. **Should see responses like:**
   ```json
   [
     {
       "id": 1,
       "orderId": 20,
       "reference": "QUADMORE_1767973687",
       "eventType": "create",
       "status": "success",
       "createdAt": "2024-01-09T12:30:00Z"
     },
     {
       "id": 2,
       "orderId": 20,
       "reference": "QUADMORE_1767973687",
       "eventType": "verify",
       "status": "success",
       "createdAt": "2024-01-09T12:35:00Z"
     }
   ]
   ```

3. **In Strapi admin panel:**
   - Go to Content Manager
   - Select "Transaction Logs" collection
   - Filter by orderId: 20
   - Should see all events logged

---

## 📋 Testing Checklist

### ✅ Test #1: Idempotency (FIX FIRST)
```
1. POST /api/orders/create with reference: "TEST_001"
2. Note the orderId returned
3. POST /api/orders/create with SAME reference: "TEST_001"
4. Should return SAME orderId
5. Check: Response should have "isNew": false
```

### ✅ Test #2: Verify Works
```
1. Create order → get orderId
2. Manually complete payment with test card on Paystack
3. POST /api/orders/verify with orderId and reference
4. Check: Response should have "status": "paid"
5. Check database: order.status should be "paid"
```

### ✅ Test #3: Transaction Logs Populated
```
1. Complete verify test above
2. GET /api/transaction-logs?filters[orderId]={{orderId}}
3. Should see at least 2 entries: "create" and "verify"
```

### ✅ Test #4: Webhook (Production Only)
```
1. Set webhook URL in Paystack dashboard
2. Deploy to production (Render)
3. Send test webhook from Paystack dashboard
4. Check Strapi logs: Should see webhook processed
5. Check transaction_logs: Should see "webhook" entry
```

---

## 🚀 What To Do Next

### Immediate (Today)
1. **Add debug logs** to create endpoint to see why idempotency fails
2. **Share terminal output** when hitting create twice with same reference
3. **Verify transaction logs** are being stored (use GET endpoint)

### This Week
1. **Fix route conflicts** if idempotency still broken
2. **Configure webhook URL** in Paystack dashboard
3. **Test full flow** end-to-end

### Before Production
1. **Update callback_url** in frontend to production domain
2. **Update webhook URL** to production domain
3. **Test with real Paystack keys**
4. **Deploy and test in production**

---

## 🤔 Your Specific Questions Answered

### Q1: Why is indempotency not working on create?
**A:** Route conflict or database check failing. Need debug logs to confirm.

### Q2: Why did redirect go to callback_url instead of webhook URL?
**A:** Different purposes:
- callback_url = Browser redirect (user-facing)
- webhook_url = Server notification (async, silent)
- Both should be configured, both serve different purposes
- Your redirect was **correct**

### Q3: Is transaction being stored in database?
**A:** YES for verify (you called it). Check with GET /api/transaction-logs.

---

## Files to Update

1. **`order.ts` controller** - Add debug logs to create
2. **`.env` file** - Ensure PAYSTACK_SECRET is set
3. **Paystack dashboard** - Set webhook URL to production endpoint
4. **Frontend** - Update callback_url to use environment variable

---

**Next Steps:** Share debug logs from trying create twice with same reference!
