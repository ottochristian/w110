# Quick Payment Flow Test Guide

## ✅ Setup Check

You have:
- ✅ Stripe keys in `.env.local`
- ✅ Stripe webhook secret in `.env.local`
- ✅ Dev server should be running

**Important:** If you just added the webhook secret, **restart your dev server** so it picks up the new env var:
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 🧪 Testing Steps

### Step 1: Get Ready

**Prerequisites:**
- Logged in as a **parent** user
- Have at least **one athlete** in your household
- Have at least **one active program/sub-program** in the current season
- Current season is set in your club

### Step 2: Browse Programs & Add to Cart

1. Go to: `http://localhost:3000/clubs/[your-club-slug]/parent/programs`
   - Replace `[your-club-slug]` with your actual club slug (e.g., `gtssf`, `jackson-hole`)

2. Select an athlete from the dropdown

3. Browse available programs

4. Click **"Add to Cart"** for one or more programs
   - ✅ Items should appear in cart
   - ✅ Cart icon in nav should update

### Step 3: Go to Cart

1. Click the cart icon or go to: `/clubs/[clubSlug]/parent/cart`

2. Verify:
   - ✅ Items are listed
   - ✅ Total amount is correct
   - ✅ "Proceed to Checkout" button is visible

### Step 4: Click Checkout

1. Click **"Proceed to Checkout"**

2. **What should happen:**
   - ✅ Button shows "Processing..."
   - ✅ Creates order in database (status: 'unpaid')
   - ✅ Creates registrations (status: 'pending')
   - ✅ Redirects to Stripe Checkout page

3. **If errors:**
   - Check browser console (F12)
   - Check terminal where dev server is running
   - Verify you're logged in

### Step 5: Complete Payment on Stripe

**On the Stripe Checkout page:**

1. Enter test card details:
   ```
   Card Number: 4242 4242 4242 4242
   Expiry Date: 12/34 (any future date)
   CVC: 123 (any 3 digits)
   ZIP: 12345 (any ZIP)
   ```

2. Enter email (optional, pre-filled)

3. Click **"Pay"** or **"Complete payment"**

4. **What should happen:**
   - ✅ Payment processes successfully
   - ✅ Redirects back to: `/clubs/[clubSlug]/parent/billing?success=true`

### Step 6: Verify Success

**Check the billing page:**
- ✅ Should show success message
- ✅ Should show your new order
- ✅ Order status: **"Paid"** or **"Success"**

### Step 7: Verify Database (Optional but Recommended)

Run these queries in Supabase SQL Editor:

**1. Check Order:**
```sql
SELECT id, status, total_amount, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 1;
```
- ✅ `status` should be `'paid'`

**2. Check Payment:**
```sql
SELECT id, amount, status, method, stripe_checkout_session_id
FROM payments
ORDER BY created_at DESC
LIMIT 1;
```
- ✅ `status` should be `'succeeded'`
- ✅ Should have `stripe_checkout_session_id`

**3. Check Registrations:**
```sql
SELECT id, status, created_at
FROM registrations
ORDER BY created_at DESC
LIMIT 5;
```
- ✅ `status` should be `'confirmed'` (changed from 'pending')

**4. Check Webhook Event:**
```sql
SELECT stripe_event_id, event_type, processed, processed_at
FROM webhook_events
ORDER BY created_at DESC
LIMIT 1;
```
- ✅ `processed` should be `true`
- ✅ `processed_at` should have a timestamp

---

## 🐛 Troubleshooting

### Issue: "Failed to create checkout session"

**Check:**
- ✅ Are you logged in? (Check browser console)
- ✅ Is Stripe secret key correct?
- ✅ Check terminal for errors

### Issue: Redirects to Stripe but payment doesn't work

**Check:**
- ✅ Using test keys (`sk_test_...`)
- ✅ Stripe account is in **test mode**
- ✅ Check Stripe Dashboard for errors

### Issue: Payment succeeds but order not marked as paid

**This means webhook didn't fire or failed:**

1. **Check if webhook secret is correct:**
   ```bash
   # In .env.local, verify:
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Check webhook endpoint:**
   - Stripe Dashboard → Webhooks → Check if event was sent
   - Look for delivery failures

3. **Check server logs:**
   - Terminal where dev server is running
   - Look for webhook errors

4. **Check webhook events table:**
   ```sql
   SELECT * FROM webhook_events
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Is the event recorded?
   - Is `processed` false?
   - Check `error_message` column

### Issue: "Invalid signature" error

- ✅ Webhook secret doesn't match
- ✅ Make sure you restarted dev server after adding secret
- ✅ If using Stripe CLI, secret changes when you restart CLI

---

## 🧪 Quick Verification Script

After completing a test payment, run this in Supabase SQL Editor:

```sql
-- Check everything in one query
SELECT 
  'Order' as type,
  o.id::text as id,
  o.status,
  o.total_amount::text as amount,
  o.created_at
FROM orders o
ORDER BY o.created_at DESC
LIMIT 1

UNION ALL

SELECT 
  'Payment' as type,
  p.id::text,
  p.status,
  p.amount::text,
  p.created_at
FROM payments p
ORDER BY p.created_at DESC
LIMIT 1

UNION ALL

SELECT 
  'Webhook Event' as type,
  we.stripe_event_id as id,
  CASE WHEN we.processed THEN 'processed' ELSE 'pending' END as status,
  we.event_type as amount,
  we.processed_at
FROM webhook_events we
ORDER BY we.created_at DESC
LIMIT 1;
```

**Expected results:**
- Order: status = `'paid'`
- Payment: status = `'succeeded'`
- Webhook Event: status = `'processed'`

---

## 🎯 What to Watch For

### Success Indicators:
1. ✅ Stripe checkout page loads
2. ✅ Payment completes
3. ✅ Redirects to billing page with success message
4. ✅ Order shows as "Paid" in database
5. ✅ Registrations show as "Confirmed"
6. ✅ Payment record created
7. ✅ Webhook event recorded and processed

### Red Flags:
- ❌ Payment succeeds but order still shows "Unpaid"
- ❌ "Invalid signature" errors in logs
- ❌ Webhook events table shows `processed = false` with errors
- ❌ No payment record created

---

## 📝 Test Checklist

Before starting:
- [ ] Dev server is running
- [ ] Logged in as parent user
- [ ] Have at least one athlete
- [ ] Have active programs in current season
- [ ] Stripe webhook secret is in `.env.local`
- [ ] Restarted dev server after adding webhook secret

During test:
- [ ] Can browse programs
- [ ] Can add programs to cart
- [ ] Cart shows correct items
- [ ] Checkout button works
- [ ] Redirects to Stripe
- [ ] Can complete payment

After test:
- [ ] Redirected to billing page
- [ ] Success message shown
- [ ] Order visible and marked as paid
- [ ] Database shows order as paid
- [ ] Database shows payment record
- [ ] Database shows registrations as confirmed
- [ ] Webhook event was processed

---

**Ready to test?** Let me know what happens at each step, or if you hit any issues!






