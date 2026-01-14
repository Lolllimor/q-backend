/**
 * ============================================================================
 * FRONTEND DEVELOPER - QUICK REFERENCE GUIDE
 * ============================================================================
 * 
 * Share this file with your frontend developer
 * Changes needed to integrate with new Paystack endpoints
 * ============================================================================
 */

// ============================================================================
// 1. ENVIRONMENT SETUP
// ============================================================================

/**
 * Add to your .env.local file (Next.js):
 * 
 * NEXT_PUBLIC_PAYSTACK_KEY=pk_test_1234567890abcdef
 * 
 * Or set in Vercel/Netlify environment variables if deployed
 * 
 * Note: pk_test_ is for testing, use pk_live_ in production
 */

// ============================================================================
// 2. UPDATE useBuyArtwork.ts HOOK
// ============================================================================

/**
 * ❌ OLD IMPLEMENTATION (Before):
 * 
 * export const useBuyArtwork = () => {
 *   const { handleBuy } = ...
 * 
 *   const handleBuy = () => {
 *     const reference = new Date().getTime().toString();
 * 
 *     const config = {
 *       reference: reference,
 *       email: email,
 *       amount: artwork.price * 100,
 *       publicKey: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
 *       metadata: {
 *         artwork_id: artwork.id,
 *         customer_name: firstName + ' ' + lastName,
 *         phone: phone
 *       }
 *     };
 * 
 *     const initializePayment = usePaystackPayment(config);
 *     initializePayment(onSuccess, onClose);
 *   };
 * };
 */

/**
 * ✅ NEW IMPLEMENTATION (After):
 * 
 * export const useBuyArtwork = () => {
 *   const router = useRouter();
 *   const [isLoading, setIsLoading] = useState(false);
 *   const [orderData, setOrderData] = useState(null);
 * 
 *   const handleBuy = async (artworkData, customerData) => {
 *     setIsLoading(true);
 * 
 *     try {
 *       // STEP 1: Create order on backend
 *       const reference = new Date().getTime().toString();
 * 
 *       const createOrderResponse = await fetch(
 *         '/api/orders/create',
 *         {
 *           method: 'POST',
 *           headers: {
 *             'Content-Type': 'application/json',
 *           },
 *           body: JSON.stringify({
 *             reference: reference,
 *             amount: artworkData.price * 100,  // Convert to kobo
 *             customerName: customerData.firstName + ' ' + customerData.lastName,
 *             email: customerData.email,
 *             phone: customerData.phone,
 *             artworkId: artworkData.id,
 *           }),
 *         }
 *       );
 * 
 *       if (!createOrderResponse.ok) {
 *         const error = await createOrderResponse.json();
 *         throw new Error(error.message);
 *       }
 * 
 *       const orderResult = await createOrderResponse.json();
 *       console.log('Order created:', orderResult.data);
 * 
 *       // Store for verification later
 *       setOrderData(orderResult.data);
 * 
 *       // STEP 2: Initialize Paystack with order info
 *       const config = {
 *         reference: orderResult.data.reference,
 *         email: customerData.email,
 *         amount: orderResult.data.amount,
 *         publicKey: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
 *         metadata: {
 *           orderId: orderResult.data.orderId,    // ← NEW!
 *           artworkId: artworkData.id,
 *           artworkTitle: artworkData.title,
 *           customerName: customerData.firstName + ' ' + customerData.lastName,
 *         },
 *       };
 * 
 *       // STEP 3: Show payment modal
 *       const initializePayment = usePaystackPayment(config);
 *       initializePayment(onSuccess, onClose);
 * 
 *     } catch (error) {
 *       console.error('Error creating order:', error);
 *       showToast('Failed to create order. Please try again.');
 *       setIsLoading(false);
 *     }
 *   };
 * 
 *   // ✅ NEW: Success callback with backend verification
 *   const onSuccess = async (reference) => {
 *     try {
 *       console.log('Payment successful, verifying...', reference);
 * 
 *       if (!orderData) {
 *         throw new Error('Order data not found');
 *       }
 * 
 *       // STEP 1: Verify payment with backend
 *       const verifyResponse = await fetch(
 *         '/api/orders/verify',
 *         {
 *           method: 'POST',
 *           headers: {
 *             'Content-Type': 'application/json',
 *             'Idempotency-Key': `${orderData.orderId}_${reference.reference}`,
 *           },
 *           body: JSON.stringify({
 *             orderId: orderData.orderId,
 *             reference: reference.reference,
 *           }),
 *         }
 *       );
 * 
 *       if (!verifyResponse.ok) {
 *         const error = await verifyResponse.json();
 *         throw new Error(error.message);
 *       }
 * 
 *       const verifyData = await verifyResponse.json();
 *       console.log('Verification response:', verifyData);
 * 
 *       if (verifyData.success) {
 *         // ✓ Payment confirmed!
 *         showToast('Payment successful!');
 * 
 *         // Reset form
 *         setOrderData(null);
 *         setIsLoading(false);
 * 
 *         // Redirect to success page
 *         router.push(
 *           `/payment-success?orderId=${orderData.orderId}&reference=${reference.reference}`
 *         );
 *       } else {
 *         throw new Error(verifyData.message || 'Verification failed');
 *       }
 * 
 *     } catch (error) {
 *       console.error('Verification error:', error);
 *       showToast(
 *         'Payment verification failed. Please contact support with reference: ' +
 *         reference.reference
 *       );
 *       setIsLoading(false);
 *     }
 *   };
 * 
 *   // ✅ NEW: Close callback
 *   const onClose = () => {
 *     console.log('Payment modal closed');
 *     setIsLoading(false);
 *     // Order is still in "pending" status
 *     // User can retry payment
 *   };
 * 
 *   return {
 *     handleBuy,
 *     isLoading,
 *     onSuccess,   // ← Pass to usePaystackPayment
 *     onClose,     // ← Pass to usePaystackPayment
 *   };
 * };
 */

// ============================================================================
// 3. UPDATE PaymentModal COMPONENT
// ============================================================================

/**
 * The PaymentModal needs to ensure it collects:
 * - First Name
 * - Last Name (combine into customerName)
 * - Email (required)
 * - Phone (required)
 * 
 * Example form validation:
 * 
 * const validateForm = () => {
 *   const errors = {};
 *   
 *   if (!firstName.trim()) errors.firstName = 'Required';
 *   if (!lastName.trim()) errors.lastName = 'Required';
 *   if (!email.trim()) errors.email = 'Required';
 *   if (!isValidEmail(email)) errors.email = 'Invalid email';
 *   if (!phone.trim()) errors.phone = 'Required';
 *   if (!isValidPhone(phone)) errors.phone = 'Invalid phone';
 *   
 *   return Object.keys(errors).length === 0 ? null : errors;
 * };
 * 
 * const handleProceedToPayment = () => {
 *   const formErrors = validateForm();
 *   if (formErrors) {
 *     setErrors(formErrors);
 *     return;
 *   }
 * 
 *   // Proceed with payment
 *   const { handleBuy } = useBuyArtwork();
 *   handleBuy(artwork, {
 *     firstName,
 *     lastName,
 *     email,
 *     phone,
 *   });
 * };
 */

// ============================================================================
// 4. API ENDPOINTS REFERENCE
// ============================================================================

/**
 * All endpoints are at your Strapi backend:
 * 
 * BASE_URL = http://localhost:1337 (local)
 *          or https://your-app.onrender.com (production)
 * 
 * ============================================================================
 * ENDPOINT 1: Create Order
 * ============================================================================
 * 
 * POST /api/orders/create
 * 
 * Request:
 * {
 *   reference: string,          // e.g., "1704667849123"
 *   amount: number,             // in kobo, e.g., 5000000
 *   customerName: string,       // "John Doe"
 *   email: string,              // "john@example.com"
 *   phone?: string,             // "08012345678"
 *   artworkId?: number          // artwork ID
 * }
 * 
 * Response (200):
 * {
 *   success: true,
 *   message: "Order created successfully",
 *   isNew: true,
 *   data: {
 *     orderId: 42,
 *     reference: "1704667849123",
 *     amount: 5000000,
 *     status: "pending",
 *     customerName: "John Doe",
 *     email: "john@example.com"
 *   }
 * }
 * 
 * Response (400 - Bad Request):
 * {
 *   success: false,
 *   message: "Missing required fields: reference, amount, customerName, email"
 * }
 * 
 * Response (500 - Server Error):
 * {
 *   error: "Failed to create order: [error message]"
 * }
 * 
 * Notes:
 * - Idempotent: Same reference always returns same order
 * - Safe to retry: Won't create duplicates
 * - Required fields: reference, amount, customerName, email
 * 
 * ============================================================================
 * ENDPOINT 2: Verify Payment
 * ============================================================================
 * 
 * POST /api/orders/verify
 * 
 * Headers:
 * {
 *   "Content-Type": "application/json",
 *   "Idempotency-Key": "42_1704667849123"  // Optional but recommended
 * }
 * 
 * Request:
 * {
 *   orderId: number,            // from create response
 *   reference: string           // from Paystack callback
 * }
 * 
 * Response (200 - Already Paid):
 * {
 *   success: true,
 *   message: "Payment already verified (cached)",
 *   alreadyPaid: false,
 *   isIdempotentReplay: true,
 *   data: {
 *     orderId: 42,
 *     status: "paid",
 *     paid: true
 *   }
 * }
 * 
 * Response (200 - Newly Verified):
 * {
 *   success: true,
 *   message: "Order verified and paid",
 *   alreadyPaid: false,
 *   data: {
 *     orderId: 42,
 *     status: "paid",
 *     paid: true
 *   }
 * }
 * 
 * Response (400 - Bad Request):
 * {
 *   error: "Missing required fields: orderId, reference"
 * }
 * 
 * Response (500 - Verification Failed):
 * {
 *   error: "Payment verification failed: [reason]"
 * }
 * 
 * Notes:
 * - Idempotent: Safe to call multiple times
 * - Checks order status before calling Paystack
 * - Idempotency-Key recommended for retry safety
 */

// ============================================================================
// 5. ERROR HANDLING
// ============================================================================

/**
 * Handle these error scenarios in frontend:
 * 
 * 1. Order creation failed
 *    if (!createOrderResponse.ok) {
 *      const error = await createOrderResponse.json();
 *      showToast(error.message || 'Failed to create order');
 *      // User can retry
 *    }
 * 
 * 2. Paystack modal closed without payment
 *    const onClose = () => {
 *      showToast('Payment cancelled');
 *      // Order stays in "pending" status
 *      // User can try again with same reference
 *    }
 * 
 * 3. Verification failed
 *    if (!verifyData.success) {
 *      showToast('Payment verification failed: ' + verifyData.message);
 *      showToast('Contact support with reference: ' + reference.reference);
 *      // Order might still be paid (webhook will confirm later)
 *    }
 * 
 * 4. Network timeout during verification
 *    catch (error) {
 *      showToast(
 *        'Connection lost. Your payment may still be processing. ' +
 *        'Please check your email for confirmation.'
 *      );
 *      // Webhook will eventually update order
 *    }
 * 
 * 5. Missing environment variable
 *    if (!process.env.NEXT_PUBLIC_PAYSTACK_KEY) {
 *      throw new Error('NEXT_PUBLIC_PAYSTACK_KEY not set');
 *    }
 */

// ============================================================================
// 6. TESTING CHECKLIST
// ============================================================================

/**
 * ✓ Test these scenarios:
 * 
 * 1. Happy Path
 *    - Fill form with valid data
 *    - Click "Buy Now"
 *    - Order created (check Strapi admin)
 *    - Paystack modal appears
 *    - Enter test card: 4111111111111111
 *    - Payment succeeds
 *    - Verify endpoint called
 *    - Redirected to success page
 *    - Check Strapi: order status = "paid"
 * 
 * 2. Test Idempotency - Create
 *    - Click "Buy Now" twice quickly
 *    - Should only create 1 order
 *    - Check Strapi: only 1 order exists
 * 
 * 3. Test Idempotency - Verify
 *    - After payment, verify request sent twice
 *    - Both should return success
 *    - Check logs: Paystack called only once
 * 
 * 4. Test Form Validation
 *    - Submit with empty fields
 *    - Should show error messages
 *    - Order not created
 * 
 * 5. Test Network Error
 *    - Simulate network timeout during create
 *    - Should show error
 *    - User can retry
 *    - Should not create duplicate order
 * 
 * 6. Test Payment Cancellation
 *    - Click "Buy Now"
 *    - Close Paystack modal
 *    - onClose callback should fire
 *    - Check Strapi: order status = "pending"
 * 
 * 7. Test Failed Payment
 *    - Use invalid test card
 *    - Paystack returns error
 *    - onClose callback fires
 *    - Order status remains "pending"
 * 
 * Test Card Numbers:
 * - Success: 4111111111111111
 * - Insufficient funds: 4000000000000002
 * - Any future expiry: 12/25
 * - Any 3-digit CVV: 123
 * - OTP: 123456
 */

// ============================================================================
// 7. DEPLOYMENT
// ============================================================================

/**
 * Before deploying to production:
 * 
 * 1. Update environment variable
 *    - Change NEXT_PUBLIC_PAYSTACK_KEY from pk_test_xxx to pk_live_xxx
 *    - Update in Vercel/Netlify environment variables
 *    - Do NOT commit to GitHub!
 * 
 * 2. Get LIVE test data
 *    - Ask backend to get LIVE keys from Paystack
 *    - LIVE keys start with: sk_live_xxx (secret), pk_live_xxx (public)
 * 
 * 3. Test with LIVE keys (no real money)
 *    - Paystack LIVE keys work with test cards
 *    - No actual charges
 *    - Use same test cards as above
 * 
 * 4. Test full flow before launch
 *    - Create order
 *    - Verify payment
 *    - Check database
 *    - Test webhook (backend)
 * 
 * 5. After launch
 *    - Monitor Paystack dashboard
 *    - Check transaction logs
 *    - Alert customers if issues
 *    - Have support contact for Paystack
 */

// ============================================================================
// 8. COMMON ISSUES & SOLUTIONS
// ============================================================================

/**
 * Issue: "Paystack key is missing. Using test key or failing."
 * Solution: Check .env.local file has NEXT_PUBLIC_PAYSTACK_KEY
 *           Restart dev server (next dev)
 * 
 * Issue: "Order creation fails with 400 error"
 * Solution: Check form validation
 *           Ensure all required fields present
 *           Check API endpoint URL is correct
 *           Check Content-Type header is application/json
 * 
 * Issue: "Paystack modal doesn't open"
 * Solution: Check publicKey is correct (starts with pk_test_)
 *           Check amount is > 0
 *           Check email is valid format
 *           Check react-paystack library is installed
 * 
 * Issue: "Verify endpoint returns 500 error"
 * Solution: Check orderId and reference are correct
 *           Check Paystack reference format is correct
 *           Check backend logs for detailed error
 *           Contact backend developer
 * 
 * Issue: "Success page doesn't load"
 * Solution: Check router.push() path is correct
 *           Check success page component exists
 *           Check for console errors in browser DevTools
 * 
 * Issue: "Multiple orders created for same payment"
 * Solution: This shouldn't happen with new idempotent code
 *           If it does: check reference is unique each time
 *           Contact backend to investigate
 */

// ============================================================================
// 9. TESTING WITH POSTMAN
// ============================================================================

/**
 * Test endpoints without frontend:
 * 
 * POST http://localhost:1337/api/orders/create
 * Headers:
 *   Content-Type: application/json
 * 
 * Body:
 * {
 *   "reference": "1704667849123",
 *   "amount": 5000000,
 *   "customerName": "Test User",
 *   "email": "test@example.com",
 *   "phone": "08012345678",
 *   "artworkId": 1
 * }
 * 
 * ============================================================================
 * 
 * POST http://localhost:1337/api/orders/verify
 * Headers:
 *   Content-Type: application/json
 *   Idempotency-Key: 1_1704667849123
 * 
 * Body:
 * {
 *   "orderId": 1,
 *   "reference": "1704667849123"
 * }
 * 
 * Note: Use actual reference from Paystack after payment
 */

// ============================================================================
// 10. MONITORING & DEBUGGING
// ============================================================================

/**
 * In browser console:
 * 
 * 1. Check if environment variable loaded
 *    console.log(process.env.NEXT_PUBLIC_PAYSTACK_KEY)
 *    Should show: pk_test_xxx... (not undefined)
 * 
 * 2. Monitor network requests
 *    DevTools → Network tab
 *    Look for:
 *    - POST /api/orders/create (should return 200)
 *    - POST /api/orders/verify (should return 200)
 * 
 * 3. Check Paystack response
 *    console.log(reference) in onSuccess
 *    Should show: {
 *      "status": "success",
 *      "reference": "1704667849123",
 *      "message": "Approval code: 123456"
 *    }
 * 
 * 4. Check Strapi admin panel
 *    http://localhost:1337/admin
 *    Go to Content Manager → Orders
 *    Verify order was created with correct data
 * 
 * 5. Check transaction logs
 *    Content Manager → Transaction Logs
 *    Should see events: create, verify, webhook
 */
