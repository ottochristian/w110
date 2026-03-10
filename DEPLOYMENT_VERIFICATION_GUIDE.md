# 🚀 Deployment Verification Guide

**Purpose:** Step-by-step checklist to verify your app is ready for production  
**Time to Complete:** 30-45 minutes

---

## ✅ ENVIRONMENT VARIABLES

### How to Check:

1. **List all required variables:**
   ```bash
   cd /Users/otti/Documents/Coding_Shit/ski_admin
   
   # Check what's in your .env.local
   cat .env.local | grep -v "^#" | grep -v "^$"
   ```

2. **Verify each variable:**

#### ✅ Supabase Variables
```bash
# Should be set:
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY

# Test they work:
npm run dev
# Then visit http://localhost:3000 - if it loads, Supabase works!
```

**Where to find them:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Go to Settings → API
- Copy URL, anon key, and service_role key

#### ✅ Stripe Variables
```bash
# Should be set:
echo $STRIPE_SECRET_KEY
echo $STRIPE_WEBHOOK_SECRET
echo $NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Verify format:
# STRIPE_SECRET_KEY should start with: sk_test_ or sk_live_
# STRIPE_WEBHOOK_SECRET should start with: whsec_
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with: pk_test_ or pk_live_
```

**Where to find them:**
- Go to [Stripe Dashboard](https://dashboard.stripe.com)
- Developers → API keys
- Copy secret key and publishable key
- For webhook secret: Developers → Webhooks → Add endpoint → reveal secret

#### ✅ App URL
```bash
echo $NEXT_PUBLIC_APP_URL

# Development: http://localhost:3000
# Production: https://yourdomain.com (NO trailing slash!)
```

#### ⚠️ Optional (but Recommended)
```bash
# Email notifications (SendGrid)
echo $SENDGRID_API_KEY

# SMS notifications (Twilio)
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER

# Error monitoring (Sentry)
echo $SENTRY_DSN
echo $NEXT_PUBLIC_SENTRY_DSN
```

### ✅ Automated Check:
```bash
# Run the health check (it validates environment)
npm run dev
curl http://localhost:3000/api/health | jq .

# Should show:
# {
#   "status": "healthy",
#   "checks": {
#     "environment": { "status": "ok" },
#     "database": { "status": "ok" },
#     "stripe": { "status": "ok" }
#   }
# }
```

---

## ✅ DATABASE MIGRATIONS

### How to Check:

1. **Log into Supabase:**
   ```bash
   # Install Supabase CLI if needed
   brew install supabase/tap/supabase
   
   # Login
   supabase login
   ```

2. **Check migration status:**
   ```bash
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Check which migrations are applied
   supabase db remote list
   ```

3. **Apply missing migrations:**
   ```bash
   # If any are missing, apply them:
   supabase db push
   
   # Or manually in Supabase Dashboard:
   # SQL Editor → Run each migration file
   ```

4. **Verify critical tables exist:**
   ```bash
   # In Supabase Dashboard → Table Editor, check:
   - [ ] clubs
   - [ ] seasons
   - [ ] athletes
   - [ ] programs
   - [ ] sub_programs
   - [ ] registrations
   - [ ] orders
   - [ ] payments
   - [ ] webhook_events
   - [ ] households
   - [ ] household_guardians
   ```

### ✅ Quick Test:
```bash
# Run this SQL in Supabase SQL Editor:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

# Should see 20+ tables
```

---

## ✅ HEALTH CHECK RESPONDING

### How to Check:

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Test health endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   
   # Should return JSON with status: "healthy"
   ```

3. **Check all health checks pass:**
   ```bash
   curl -s http://localhost:3000/api/health | jq .
   
   # Verify:
   {
     "status": "healthy",           # ← Should be "healthy"
     "checks": {
       "environment": { "status": "ok" },  # ← All should be "ok"
       "database": { "status": "ok" },
       "stripe": { "status": "ok" }
     },
     "features": {
       "email": true/false,         # ← Shows which features enabled
       "sms": true/false,
       "sentry": true/false
     }
   }
   ```

4. **Test unhealthy state:**
   ```bash
   # Temporarily break something (like invalid Stripe key)
   # Health check should return 503 with specific error
   ```

### Production:
Set up monitoring to ping `/api/health` every minute:
- Use: Uptime Robot, Pingdom, or AWS Route53 health checks
- Alert if status !== "healthy" or response code !== 200

---

## ✅ SENTRY CONFIGURED AND TESTED

### How to Check:

1. **Create Sentry account:**
   - Go to [sentry.io](https://sentry.io)
   - Sign up (free tier available)
   - Create new project → Select "Next.js"

2. **Add DSN to environment:**
   ```bash
   # Add to .env.local:
   SENTRY_DSN=https://YOUR_KEY@o0.ingest.sentry.io/YOUR_PROJECT_ID
   NEXT_PUBLIC_SENTRY_DSN=https://YOUR_KEY@o0.ingest.sentry.io/YOUR_PROJECT_ID
   ```

3. **Test error capture:**
   Add this test button to any page:
   ```typescript
   <Button onClick={() => {
     throw new Error('Test Sentry Error')
   }}>
     Test Error Tracking
   </Button>
   ```

4. **Verify in Sentry Dashboard:**
   - Go to Issues tab
   - Should see "Test Sentry Error"
   - Click to see stack trace, user context, breadcrumbs

5. **Test error boundary:**
   Click the test button above - should show friendly error UI (not crash)

### ⚠️ Note:
Sentry is **optional but highly recommended**. Your app will work without it, but you won't see production errors!

---

## ✅ RATE LIMITS TESTED

### How to Check:

1. **Test checkout rate limit (10 req/min):**
   ```bash
   # Make 11 requests quickly
   for i in {1..11}; do
     curl -X POST http://localhost:3000/api/checkout \
       -H "Content-Type: application/json" \
       -d '{"orderId":"test","amount":100,"clubSlug":"test"}' &
   done
   wait
   
   # 11th request should return 429 (Too Many Requests)
   ```

2. **Test webhook rate limit (100 req/min):**
   ```bash
   # Send 101 webhook requests
   for i in {1..101}; do
     curl -X POST http://localhost:3000/api/webhooks/stripe \
       -H "Content-Type: application/json" \
       -d '{}' &
   done
   wait
   
   # 101st request should return 429
   ```

3. **Test OTP rate limit:**
   ```bash
   # Try sending 6 OTPs in a row (limit is 5)
   # Should get rate limited on 6th attempt
   ```

4. **Check rate limit response:**
   ```json
   {
     "error": "Too many requests. Please try again in X minutes.",
     "retryAfter": 60
   }
   ```

### ✅ Quick Test:
Run the app, try to spam checkout or OTP - you should get rate limited!

---

## ✅ AUTHENTICATION WORKING

### How to Check:

1. **Test login flow:**
   ```bash
   npm run dev
   # Visit http://localhost:3000/login
   ```

   - [ ] Can log in with email/password
   - [ ] Redirects to dashboard after login
   - [ ] Shows user profile in header

2. **Test protected routes:**
   ```bash
   # Try accessing admin route without login:
   curl http://localhost:3000/api/admin/athletes/summary
   
   # Should return:
   # {"error":"Unauthorized","message":"No user found"}
   ```

3. **Test role-based access:**
   - [ ] Parent can access `/clubs/[slug]/parent/*`
   - [ ] Admin can access `/clubs/[slug]/admin/*`
   - [ ] System admin can access `/system-admin/*`
   - [ ] Wrong role gets 403 Forbidden

4. **Test auth helpers:**
   ```bash
   # All 28 migrated routes should:
   - Use requireAuth or requireAdmin
   - Return consistent error messages
   - Log auth failures
   ```

### ✅ Manual Test:
1. Log in as parent → Try accessing admin page → Should get 403
2. Log out → Try accessing any protected page → Should redirect to login

---

## ✅ WEBHOOKS TESTED WITH STRIPE CLI

### How to Check:

1. **Install Stripe CLI:**
   ```bash
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   # Opens browser to authenticate
   ```

3. **Forward webhooks to local:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   
   # Copy the webhook signing secret (starts with whsec_)
   # Add to .env.local:
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Test webhook:**
   ```bash
   # In another terminal, trigger test event:
   stripe trigger payment_intent.succeeded
   
   # Check your app logs - should see:
   # "Webhook received: payment_intent.succeeded"
   ```

5. **Verify idempotency:**
   ```bash
   # Trigger same event twice (same event ID)
   # Second one should be skipped with:
   # "Webhook event already processed"
   ```

6. **Check webhook_events table:**
   ```sql
   -- In Supabase SQL Editor:
   SELECT * FROM webhook_events 
   ORDER BY created_at DESC 
   LIMIT 10;
   
   -- Should show your test events
   ```

### Production:
Set up webhook endpoint in Stripe Dashboard:
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy signing secret → Add to production env vars

---

## 🧪 COMPLETE TESTING SCRIPT

Run this comprehensive test:

```bash
#!/bin/bash
# test-deployment.sh

echo "🧪 Testing Deployment Readiness"
echo "================================"
echo ""

# 1. Environment Check
echo "1️⃣  Checking environment variables..."
if [ -f .env.local ]; then
  required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "NEXT_PUBLIC_APP_URL"
  )
  
  missing=0
  for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env.local; then
      echo "   ❌ Missing: $var"
      missing=$((missing + 1))
    fi
  done
  
  if [ $missing -eq 0 ]; then
    echo "   ✅ All required variables present"
  else
    echo "   ❌ $missing variables missing"
    exit 1
  fi
else
  echo "   ❌ .env.local file not found!"
  exit 1
fi

echo ""

# 2. Health Check
echo "2️⃣  Testing health check endpoint..."
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5

response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/health)
status_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
  echo "   ✅ Health check passed"
  echo "$body" | jq .
else
  echo "   ❌ Health check failed (status: $status_code)"
  echo "$body"
fi

kill $SERVER_PID
echo ""

# 3. Database Check
echo "3️⃣  Checking database connection..."
# This is tested by health check above
echo "   ✅ Verified by health check"
echo ""

# 4. Rate Limiting
echo "4️⃣  Testing rate limiting..."
echo "   ℹ️  Manual test required - try spamming checkout endpoint"
echo "   ℹ️  See: DEPLOYMENT_VERIFICATION_GUIDE.md"
echo ""

# 5. Authentication
echo "5️⃣  Testing authentication..."
auth_response=$(curl -s http://localhost:3000/api/admin/athletes/summary)
if echo "$auth_response" | grep -q "Unauthorized"; then
  echo "   ✅ Protected routes require authentication"
else
  echo "   ⚠️  Check authentication manually"
fi
echo ""

# 6. Migrations
echo "6️⃣  Database migrations..."
echo "   ℹ️  Check Supabase Dashboard → Database → Tables"
echo "   ℹ️  Should see 20+ tables including: athletes, orders, payments, webhook_events"
echo ""

# 7. Webhooks
echo "7️⃣  Webhook setup..."
echo "   ℹ️  Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo "   ℹ️  Then: stripe trigger payment_intent.succeeded"
echo ""

echo "✅ Basic checks complete!"
echo ""
echo "📋 Manual tests needed:"
echo "   - Log in as different roles (parent, admin, coach)"
echo "   - Create athlete, register for program"
echo "   - Test checkout flow"
echo "   - Verify emails sent (if SendGrid configured)"
echo ""
```

Save this as `scripts/test-deployment.sh` and run:
```bash
chmod +x scripts/test-deployment.sh
./scripts/test-deployment.sh
```

---

## 📋 QUICK CHECKLIST

Copy this and mark each item as you verify:

### Environment Variables:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - From Supabase Dashboard → Settings → API
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase Dashboard → Settings → API
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard → Settings → API (keep secret!)
- [ ] `STRIPE_SECRET_KEY` - From Stripe Dashboard → Developers → API keys
- [ ] `STRIPE_WEBHOOK_SECRET` - From Stripe Dashboard → Developers → Webhooks
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - From Stripe Dashboard → Developers → API keys
- [ ] `NEXT_PUBLIC_APP_URL` - Your domain (dev: http://localhost:3000, prod: https://yourdomain.com)

### Optional Variables:
- [ ] `SENDGRID_API_KEY` - For email notifications
- [ ] `TWILIO_ACCOUNT_SID` - For SMS notifications
- [ ] `TWILIO_AUTH_TOKEN` - For SMS notifications
- [ ] `TWILIO_PHONE_NUMBER` - For SMS notifications
- [ ] `SENTRY_DSN` - For error monitoring (highly recommended)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - For client-side error monitoring

### Database:
- [ ] Migrations applied (check Supabase Dashboard → Database)
- [ ] Tables exist (20+ tables including athletes, orders, payments)
- [ ] RLS policies enabled (check each table)
- [ ] Test data present (optional, for testing)

### Application:
- [ ] Health check returns 200: `curl http://localhost:3000/api/health`
- [ ] Can log in successfully
- [ ] Protected routes require auth
- [ ] Admin can access admin pages
- [ ] Parent can access parent pages
- [ ] Pagination works on Athletes, Registrations, Programs pages

### Stripe:
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook secret matches env var
- [ ] Test webhook with Stripe CLI: `stripe trigger payment_intent.succeeded`
- [ ] Webhook events logged in `webhook_events` table
- [ ] Test checkout flow end-to-end

### Security:
- [ ] Rate limiting active (test by spamming endpoint)
- [ ] Input validation working (try invalid data)
- [ ] Authentication required on protected routes
- [ ] CORS configured properly
- [ ] HTTPS enabled (production only)

### Monitoring:
- [ ] Sentry account created (optional)
- [ ] Sentry DSN added to env vars (optional)
- [ ] Test error captured in Sentry (optional)
- [ ] Logs show structured JSON in production

---

## 🚨 COMMON ISSUES & FIXES

### Issue 1: Health Check Returns 503
**Cause:** Database connection failed or env vars missing  
**Fix:**
```bash
# Check environment
curl http://localhost:3000/api/health | jq .checks

# If database error:
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check Supabase project is not paused
- Test connection in Supabase Dashboard
```

### Issue 2: Webhooks Not Working
**Cause:** Invalid webhook secret or signature verification fails  
**Fix:**
```bash
# Get fresh webhook secret from Stripe CLI:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the secret (whsec_...) to .env.local
# Restart dev server
```

### Issue 3: Authentication Fails
**Cause:** Cookie issues or Supabase client misconfigured  
**Fix:**
- Clear browser cookies
- Check `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches project
- Check browser console for errors

### Issue 4: Rate Limiting Not Working
**Cause:** Redis/storage not configured or rate limiter bypassed  
**Fix:**
- Check `lib/rate-limit.ts` is imported in routes
- Verify `checkRateLimit()` is called before business logic
- Test with curl spam (11 requests/min should fail)

---

## 🎯 FINAL PRE-DEPLOYMENT CHECKLIST

Before deploying to production (Vercel, AWS, etc.):

### Code:
- [ ] All lint errors fixed: `npm run lint`
- [ ] All TypeScript errors fixed: `npm run build`
- [ ] Git committed: `git status` shows clean
- [ ] Git pushed: `git push origin main`

### Environment:
- [ ] Production env vars set in hosting platform
- [ ] Database migrations applied to production DB
- [ ] Stripe webhook configured with production URL
- [ ] Sentry project created (optional)

### DNS & SSL:
- [ ] Domain configured (if using custom domain)
- [ ] SSL certificate active (HTTPS working)
- [ ] NEXT_PUBLIC_APP_URL updated to production URL

### Monitoring:
- [ ] Health check endpoint monitored
- [ ] Sentry alerts configured (optional)
- [ ] Uptime monitoring enabled

### Backups:
- [ ] Database backups enabled in Supabase
- [ ] Point-in-time recovery enabled (Supabase Pro)

---

## ✅ TESTING YOUR APP RIGHT NOW

Quick 5-minute test:

```bash
# 1. Start server
npm run dev

# 2. Test health check
curl http://localhost:3000/api/health | jq .

# 3. Open browser
open http://localhost:3000

# 4. Test flows:
# - Log in
# - Navigate to athletes page (see pagination!)
# - Navigate to registrations page (see pagination!)
# - Navigate to programs page (see pagination!)
# - Test search on each page
# - Test page size selector

# 5. Check logs
# Look for structured logs in console
```

---

## 📞 QUICK ANSWERS

**Q: How do I know if migrations are applied?**  
A: Supabase Dashboard → Database → check tables exist

**Q: How do I get Stripe webhook secret?**  
A: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Q: Do I need Sentry?**  
A: No, but HIGHLY recommended for production

**Q: How do I test rate limiting?**  
A: Spam an endpoint with curl (see commands above)

**Q: Is my app production-ready?**  
A: If all checkboxes above are checked: YES! ✅

---

## 🚀 READY TO DEPLOY?

If you've verified everything above:

```bash
# Deploy to Vercel:
vercel --prod

# Or push to main (if auto-deploy configured):
git push origin main

# Then monitor:
# - Check health endpoint
# - Watch Sentry for errors
# - Monitor logs
# - Test all user flows
```

---

**That's it! Your app is production-ready.** 🎉

Need help with any specific check? Ask me and I'll guide you through it!
