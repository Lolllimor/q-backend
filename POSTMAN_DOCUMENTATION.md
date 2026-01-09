# Postman Documentation: Paystack Integration

Complete guide to testing the Paystack payment integration using Postman.

---

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Environment Configuration](#environment-configuration)
3. [API Endpoints](#api-endpoints)
4. [Testing Workflows](#testing-workflows)
5. [Error Scenarios](#error-scenarios)
6. [Debugging Tips](#debugging-tips)
7. [Postman Collection JSON](#postman-collection-json)

---

## Setup Instructions

### Step 1: Import Collection into Postman

1. Open Postman
2. Click **Import** in the top-left
3. Choose **Raw text** tab
4. Paste the [Postman Collection JSON](#postman-collection-json) at the bottom of this document
5. Click **Import**
6. A new collection "Paystack Integration" will appear in your Collections

### Step 2: Create Environment

1. Click the **Environments** icon (gear icon) in the top-right
2. Click **Create New** or **+**
3. Name it: `Paystack Dev`
4. Add variables (see [Environment Configuration](#environment-configuration) below)
5. Click **Save**

### Step 3: Select Environment

1. In the top-right, find the environment dropdown
2. Select **Paystack Dev**
3. You're ready to test!

---

## Environment Configuration

### Variables to Set Up

Create environment variables with these values:

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:1337` | Your local Strapi backend |
| `paystack_secret` | `sk_test_...` | Paystack secret test key (from Paystack dashboard) |
| `paystack_key` | `pk_test_...` | Paystack public test key |
| `order_id` | `1` | Will be updated after creating order |
| `reference` | `unique_ref_123` | Will be updated after creating order |
| `customer_email` | `test@example.com` | Test customer email |

### How to Set Up Paystack Test Keys

1. Go to [paystack.com/dashboard](https://paystack.com/dashboard)
2. Log in to your account
3. Navigate to **Settings** → **API Keys & Webhooks**
4. Copy the **Secret Key** (sk_test_...)
5. Copy the **Public Key** (pk_test_...)
6. Add both to your Postman environment

### Environment JSON Format

```json
{
  "name": "Paystack Dev",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:1337",
      "enabled": true
    },
    {
      "key": "paystack_secret",
      "value": "sk_test_YOUR_SECRET_KEY",
      "enabled": true
    },
    {
      "key": "paystack_key",
      "value": "pk_test_YOUR_PUBLIC_KEY",
      "enabled": true
    },
    {
      "key": "order_id",
      "value": "1",
      "enabled": true
    },
    {
      "key": "reference",
      "value": "REF123456789",
      "enabled": true
    },
    {
      "key": "customer_email",
      "value": "test@example.com",
      "enabled": true
    }
  ]
}
```

---

## API Endpoints

### 1. Create Order

**Purpose:** Create a new order before initiating payment

**Method:** `POST`

**URL:** `{{base_url}}/api/orders/create`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 50000,
  "customerName": "Chidi Okonkwo",
  "email": "chidi@example.com",
  "phone": "2348012345678",
  "artworkId": 5,
  "reference": "CHIDI_ART_001_{{$timestamp}}"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": 123,
    "documentId": "abc123def456",
    "amount": 50000,
    "customerName": "Chidi Okonkwo",
    "email": "chidi@example.com",
    "phone": "2348012345678",
    "artworkId": 5,
    "reference": "CHIDI_ART_001_1704856234567",
    "status": "pending",
    "transactionId": null,
    "failureReason": null,
    "createdAt": "2024-01-09T12:30:34.567Z",
    "updatedAt": "2024-01-09T12:30:34.567Z"
  },
  "meta": {}
}
```

**Postman Test Script:**
```javascript
// After successful response, save order details to environment
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("order_id", response.data.id);
    pm.environment.set("reference", response.data.reference);
    console.log("✓ Order created: " + response.data.id);
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": {
    "message": "Missing required fields",
    "status": 400,
    "details": "amount, customerName, email are required"
  }
}
```

---

### 2. Verify Payment

**Purpose:** Verify payment after customer completes Paystack payment

**Method:** `POST`

**URL:** `{{base_url}}/api/orders/verify`

**Headers:**
```
Content-Type: application/json
Idempotency-Key: {{reference}}_verify_{{$timestamp}}
```

**Request Body:**
```json
{
  "orderId": {{order_id}},
  "reference": "{{reference}}"
}
```

**Response (200 OK - Payment Confirmed):**
```json
{
  "data": {
    "id": 123,
    "documentId": "abc123def456",
    "amount": 50000,
    "customerName": "Chidi Okonkwo",
    "email": "chidi@example.com",
    "status": "paid",
    "transactionId": "1234567890",
    "reference": "CHIDI_ART_001_1704856234567",
    "failureReason": null,
    "createdAt": "2024-01-09T12:30:34.567Z",
    "updatedAt": "2024-01-09T12:35:45.123Z"
  },
  "meta": {}
}
```

**Response (400 Bad Request - Payment Not Found):**
```json
{
  "error": {
    "message": "Payment verification failed",
    "status": 400,
    "details": "Payment with reference not found on Paystack"
  }
}
```

**Response (409 Conflict - Order Already Paid):**
```json
{
  "error": {
    "message": "Order already paid",
    "status": 409,
    "details": "This order has already been marked as paid"
  }
}
```

**Postman Test Script:**
```javascript
// Verify payment and check status
pm.test("Payment verification successful", function () {
    pm.response.to.have.status(200);
    const response = pm.response.json();
    pm.expect(response.data.status).to.equal("paid");
    pm.expect(response.data.transactionId).to.be.not.null;
    console.log("✓ Payment verified for order: " + response.data.id);
});
```

---

### 3. Webhook Endpoint

**Purpose:** Receives webhook from Paystack when payment succeeds

**Method:** `POST`

**URL:** `{{base_url}}/paystack/webhook`

**Headers (Set by Paystack):**
```
Content-Type: application/json
x-paystack-signature: {{paystack_signature}}
```

**Request Body (From Paystack):**
```json
{
  "event": "charge.success",
  "data": {
    "id": 1234567890,
    "reference": "CHIDI_ART_001_1704856234567",
    "amount": 5000000,
    "customer": {
      "id": 1,
      "email": "chidi@example.com",
      "customer_code": "CUS_1234567890",
      "first_name": "Chidi",
      "last_name": "Okonkwo",
      "phone": "+2348012345678"
    },
    "status": "success",
    "paid_at": "2024-01-09T12:35:00.000Z",
    "created_at": "2024-01-09T12:30:00.000Z"
  }
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Event processed successfully"
}
```

**Note:** This endpoint is called by Paystack, not manually in Postman. See [Testing Webhooks](#testing-webhooks) for how to test.

---

## Testing Workflows

### Workflow 1: Happy Path (Successful Payment)

**Scenario:** Customer pays successfully

**Steps:**

#### Step 1: Create Order
- **Request:** POST `/api/orders/create`
- **Payload:**
  ```json
  {
    "amount": 50000,
    "customerName": "Test User",
    "email": "test@example.com",
    "phone": "2348012345678",
    "artworkId": 1,
    "reference": "TEST_001_{{$timestamp}}"
  }
  ```
- **Expected:** 200 OK, receive `order_id` and `reference`
- **Save:** Extract and save `order_id` and `reference` to environment

#### Step 2: Simulate Paystack Payment
- Go to [Paystack Documentation](https://paystack.com/docs)
- Use test card: `4111111111111111`
- CVV: Any 3 digits
- Expiry: Any future date
- Or use Postman to call Paystack API directly

#### Step 3: Verify Payment
- **Request:** POST `/api/orders/verify`
- **Payload:**
  ```json
  {
    "orderId": {{order_id}},
    "reference": "{{reference}}"
  }
  ```
- **Expected:** 200 OK, `status` = "paid"
- **Verify:** Order status changed to "paid" in database

#### Step 4: Check Transaction Log
- **Request:** GET `/api/transaction-logs?filters[orderId]={{order_id}}`
- **Expected:** See entries for "create" and "verify" events

---

### Workflow 2: Idempotency Test (Double Request)

**Scenario:** Same request sent twice (network retry)

**Steps:**

#### Step 1: Create Order
```json
{
  "amount": 30000,
  "customerName": "Idempotency Test",
  "email": "idempotent@example.com",
  "phone": "2348012345678",
  "artworkId": 2,
  "reference": "IDEM_001_1704856234567"
}
```

#### Step 2: Send Same Reference Again
- Send same request with **identical reference**
- **Expected:** Same response, no duplicate order created
- **Verify:** `order_id` is same as Step 1

#### Step 3: Verify Payment (First Time)
```json
{
  "orderId": {{order_id}},
  "reference": "IDEM_001_1704856234567"
}
```
- **Expected:** 200 OK, status = "paid"

#### Step 4: Verify Payment (Second Time - Same Request)
```json
{
  "orderId": {{order_id}},
  "reference": "IDEM_001_1704856234567"
}
```
- **Expected:** 200 OK (idempotent response)
- **Not Expected:** Error like "already paid"
- **Verify:** Only one transaction_log entry for this verification

---

### Workflow 3: Webhook Processing

**Scenario:** Paystack sends webhook after payment

**Steps:**

#### Step 1: Manually Trigger Webhook in Postman
```
POST {{base_url}}/paystack/webhook
Content-Type: application/json
x-paystack-signature: {{signature_hash}}

{
  "event": "charge.success",
  "data": {
    "reference": "{{reference}}",
    "status": "success",
    "amount": 5000000,
    "customer": {
      "email": "test@example.com"
    }
  }
}
```

#### Step 2: Generate Valid Signature
```javascript
// In Postman pre-request script
const crypto = require('crypto');
const body = JSON.stringify(pm.request.body.raw);
const secret = pm.environment.get("paystack_secret");
const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
pm.request.headers.add({key: 'x-paystack-signature', value: hash});
```

#### Step 3: Send Webhook
- **Expected:** 200 OK
- **Check:** Order status updated to "paid"

#### Step 4: Send Same Webhook Again
- **Expected:** 200 OK (idempotent)
- **Verify:** Order still "paid", no duplicate updates

---

## Error Scenarios

### Error 1: Missing Required Fields

**Request:**
```json
{
  "amount": 50000
}
```

**Response (400):**
```json
{
  "error": {
    "message": "Missing required fields",
    "status": 400,
    "details": "customerName, email are required"
  }
}
```

**How to Test in Postman:**
```javascript
pm.test("Missing fields error", function () {
    pm.response.to.have.status(400);
    const response = pm.response.json();
    pm.expect(response.error.message).to.include("Missing");
});
```

---

### Error 2: Invalid Amount

**Request:**
```json
{
  "amount": -100,
  "customerName": "Test",
  "email": "test@example.com"
}
```

**Response (400):**
```json
{
  "error": {
    "message": "Invalid amount",
    "status": 400,
    "details": "Amount must be greater than 0"
  }
}
```

---

### Error 3: Payment Not Found

**Request:**
```json
{
  "orderId": 999,
  "reference": "INVALID_REF_123"
}
```

**Response (400):**
```json
{
  "error": {
    "message": "Payment verification failed",
    "status": 400,
    "details": "Payment with reference INVALID_REF_123 not found on Paystack"
  }
}
```

---

### Error 4: Order Not Found

**Request:**
```json
{
  "orderId": 999999,
  "reference": "ANY_REF"
}
```

**Response (404):**
```json
{
  "error": {
    "message": "Order not found",
    "status": 404,
    "details": "Order with ID 999999 does not exist"
  }
}
```

---

### Error 5: Invalid Webhook Signature

**Request:**
```
POST /paystack/webhook
x-paystack-signature: invalid_signature_hash
```

**Response (401):**
```json
{
  "error": {
    "message": "Invalid webhook signature",
    "status": 401,
    "details": "Webhook signature validation failed"
  }
}
```

---

## Debugging Tips

### Tip 1: Check Environment Variables

```javascript
// In Postman Console, run:
console.log(pm.environment.get("base_url"));
console.log(pm.environment.get("order_id"));
console.log(pm.environment.get("reference"));
```

### Tip 2: View Request/Response

1. Send request
2. Click **Response** tab
3. View full JSON
4. Check **Status Code**
5. Review **Headers**

### Tip 3: Use Postman Console

1. Press **Ctrl+Alt+C** (or Cmd+Option+C on Mac)
2. View all logs from requests
3. See console output from test scripts
4. Check for errors

### Tip 4: Save Responses to Workspace

1. After successful request
2. Click **Save as Example**
3. Name it (e.g., "Order Created - Success")
4. Reference later in documentation

### Tip 5: Test Performance

```javascript
// Add to test script
pm.test("Response time < 1000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

### Tip 6: Validate Schema

```javascript
// In test script
pm.test("Response schema valid", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property("data");
    pm.expect(response.data).to.have.property("id");
    pm.expect(response.data).to.have.property("status");
});
```

---

## Postman Collection JSON

### Import this into Postman

Copy everything below and import as a new collection:

```json
{
  "info": {
    "name": "Paystack Integration",
    "description": "Complete API collection for testing Paystack payment integration with Strapi backend",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Order Management",
      "item": [
        {
          "name": "Create Order",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"amount\": 50000,\n  \"customerName\": \"Chidi Okonkwo\",\n  \"email\": \"chidi@example.com\",\n  \"phone\": \"2348012345678\",\n  \"artworkId\": 5,\n  \"reference\": \"CHIDI_ART_001_{{$timestamp}}\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/orders/create",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "orders",
                "create"
              ]
            },
            "description": "Create a new order before initiating payment"
          },
          "response": [],
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.environment.set('order_id', response.data.id);",
                  "    pm.environment.set('reference', response.data.reference);",
                  "    console.log('✓ Order created: ' + response.data.id);",
                  "}",
                  "",
                  "pm.test('Order created successfully', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.data).to.have.property('id');",
                  "    pm.expect(response.data).to.have.property('reference');",
                  "    pm.expect(response.data.status).to.equal('pending');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          "name": "Verify Payment",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Idempotency-Key",
                "value": "{{reference}}_verify_{{$timestamp}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"orderId\": {{order_id}},\n  \"reference\": \"{{reference}}\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/orders/verify",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "orders",
                "verify"
              ]
            },
            "description": "Verify payment after customer completes Paystack payment"
          },
          "response": [],
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Payment verification successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.data.status).to.equal('paid');",
                  "    pm.expect(response.data.transactionId).to.be.not.null;",
                  "});"
                ]
              }
            }
          ]
        },
        {
          "name": "Get Order by ID",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/orders/{{order_id}}",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "orders",
                "{{order_id}}"
              ]
            },
            "description": "Fetch a single order by ID"
          },
          "response": []
        },
        {
          "name": "List All Orders",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/orders",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "orders"
              ]
            },
            "description": "Get all orders"
          },
          "response": []
        }
      ]
    },
    {
      "name": "Transaction Logs",
      "item": [
        {
          "name": "Get Transaction Logs for Order",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/transaction-logs?filters[orderId]={{order_id}}",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "transaction-logs"
              ],
              "query": [
                {
                  "key": "filters[orderId]",
                  "value": "{{order_id}}"
                }
              ]
            },
            "description": "Get transaction logs for a specific order to verify all operations"
          },
          "response": []
        },
        {
          "name": "Get All Transaction Logs",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/transaction-logs",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "transaction-logs"
              ]
            },
            "description": "Get all transaction logs for debugging and audit trail"
          },
          "response": []
        }
      ]
    },
    {
      "name": "Testing Scenarios",
      "item": [
        {
          "name": "[1] Happy Path - Create Order",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"amount\": 50000,\n  \"customerName\": \"Test User - Happy Path\",\n  \"email\": \"happypath@example.com\",\n  \"phone\": \"2348012345678\",\n  \"artworkId\": 1,\n  \"reference\": \"HAPPYPATH_{{$timestamp}}\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/orders/create",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "orders",
                "create"
              ]
            }
          }
        },
        {
          "name": "[2] Idempotency Test - Same Reference",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"amount\": 30000,\n  \"customerName\": \"Idempotency Test\",\n  \"email\": \"idempotent@example.com\",\n  \"phone\": \"2348012345678\",\n  \"artworkId\": 2,\n  \"reference\": \"IDEM_001_1704856234567\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/orders/create",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "orders",
                "create"
              ]
            },
            "description": "Send same reference twice - should return same order"
          }
        },
        {
          "name": "[3] Error Test - Missing Fields",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"amount\": 50000\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/orders/create",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "orders",
                "create"
              ]
            },
            "description": "Test missing required fields error handling"
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Returns 400 for missing fields', function () {",
                  "    pm.response.to.have.status(400);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          "name": "[4] Error Test - Invalid Amount",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"amount\": -100,\n  \"customerName\": \"Invalid Amount Test\",\n  \"email\": \"invalid@example.com\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/orders/create",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "orders",
                "create"
              ]
            },
            "description": "Test invalid amount validation"
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Returns 400 for invalid amount', function () {",
                  "    pm.response.to.have.status(400);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          "name": "[5] Error Test - Order Not Found",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"orderId\": 999999,\n  \"reference\": \"FAKE_REF_123\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/orders/verify",
              "host": [
                "{{base_url}}"
              ],
              "path": [
                "api",
                "orders",
                "verify"
              ]
            },
            "description": "Test order not found error"
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Returns 404 for non-existent order', function () {",
                  "    pm.response.to.have.status(404);",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:1337"
    },
    {
      "key": "paystack_secret",
      "value": ""
    },
    {
      "key": "paystack_key",
      "value": ""
    },
    {
      "key": "order_id",
      "value": ""
    },
    {
      "key": "reference",
      "value": ""
    },
    {
      "key": "customer_email",
      "value": "test@example.com"
    }
  ]
}
```

---

## Quick Start Checklist

- [ ] Install Postman from [postman.com](https://postman.com)
- [ ] Copy the JSON collection above
- [ ] Import into Postman
- [ ] Create `Paystack Dev` environment
- [ ] Add environment variables (base_url, paystack_secret, etc.)
- [ ] Start Strapi: `npm run dev`
- [ ] Send first request: "Create Order"
- [ ] Check response status and save variables
- [ ] Test idempotency with same reference
- [ ] Test error scenarios
- [ ] Review transaction logs
- [ ] Ready to integrate frontend!

---

## Useful Paystack Test Cards

| Card Number | CVV | Expiry | Result |
|------------|-----|--------|--------|
| 4111111111111111 | Any 3 digits | Any future date | Successful payment |
| 5399811111111111 | Any 3 digits | Any future date | Successful payment (Mastercard) |

**Note:** Only use test cards in test environment. Never use real cards.

---

## Troubleshooting

### Postman Variables Not Updating

**Problem:** `{{order_id}}` shows as undefined

**Solution:**
1. Verify environment is selected (top-right dropdown)
2. Check test script is running (look in Postman Console)
3. Manually set variables in environment panel

### 401 Unauthorized on Webhook

**Problem:** Webhook signature validation fails

**Solution:**
1. Verify `PAYSTACK_SECRET` is correct
2. Check signature is being calculated with raw body (not parsed JSON)
3. Compare with Paystack dashboard webhook logs

### 400 Bad Request on Verify

**Problem:** "Payment verification failed"

**Solution:**
1. Use test card from Paystack documentation
2. Verify reference is correct and matches created order
3. Check Paystack test keys in environment
4. Wait a moment - Paystack needs time to process

### Connection Refused

**Problem:** "Could not get any response"

**Solution:**
1. Verify Strapi is running: `npm run dev`
2. Check base_url is correct (http://localhost:1337)
3. Try http:// not https:// for local development
4. Check firewall settings

---

## Next Steps

1. **Frontend Developer:** Import `FRONTEND_INTEGRATION_GUIDE.md`
2. **Test with Real Paystack:** Get live keys from paystack.com
3. **Deploy to Production:** Update environment variables on Render/Vercel
4. **Monitor Webhooks:** Configure webhook logging and monitoring
5. **Customer Support:** Use transaction logs to debug customer issues

---

**Last Updated:** January 9, 2026
**Version:** 1.0
**Maintained by:** Paystack Integration Team
