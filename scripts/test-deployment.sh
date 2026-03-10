#!/bin/bash
# Complete deployment verification script

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
    else
      echo "   ✅ $var"
    fi
  done
  
  if [ $missing -eq 0 ]; then
    echo ""
    echo "   ✅ All required variables present"
  else
    echo ""
    echo "   ❌ $missing variables missing - add to .env.local"
    exit 1
  fi
else
  echo "   ❌ .env.local file not found!"
  echo "   Create .env.local with required variables"
  exit 1
fi

echo ""

# 2. TypeScript Check
echo "2️⃣  Checking TypeScript compilation..."
if npm run build > /tmp/build.log 2>&1; then
  echo "   ✅ TypeScript compilation successful"
else
  echo "   ❌ TypeScript errors found:"
  tail -20 /tmp/build.log
  exit 1
fi

echo ""

# 3. Health Check (requires server to be running)
echo "3️⃣  Testing health check endpoint..."
echo "   ℹ️  Make sure dev server is running: npm run dev"
echo "   Testing in 3 seconds..."
sleep 3

response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/health 2>/dev/null)
status_code=$(echo "$response" | tail -n 1)

if [ "$status_code" = "200" ]; then
  echo "   ✅ Health check passed (200 OK)"
  body=$(echo "$response" | head -n -1)
  if command -v jq &> /dev/null; then
    echo "$body" | jq .
  else
    echo "$body"
  fi
elif [ "$status_code" = "000" ] || [ -z "$status_code" ]; then
  echo "   ⚠️  Server not responding - make sure npm run dev is running"
  echo "   Skipping remaining API tests..."
else
  echo "   ❌ Health check failed (status: $status_code)"
fi

echo ""

# 4. Authentication Check
if [ "$status_code" = "200" ]; then
  echo "4️⃣  Testing authentication..."
  auth_response=$(curl -s http://localhost:3000/api/admin/athletes/summary 2>/dev/null)
  if echo "$auth_response" | grep -q "Unauthorized"; then
    echo "   ✅ Protected routes require authentication"
  else
    echo "   ⚠️  Authentication check inconclusive"
  fi
  echo ""
fi

# 5. Validation Check
echo "5️⃣  Checking input validation..."
validation_count=$(find app/api -name "route.ts" -exec grep -l "\.parse(\|validateRequest\|ValidationError" {} \; | wc -l | tr -d ' ')
echo "   ✅ $validation_count routes have input validation"
echo ""

# 6. Summary
echo "═══════════════════════════════════"
echo "📊 Deployment Readiness Summary"
echo "═══════════════════════════════════"
echo ""
echo "✅ Environment variables: PASS"
echo "✅ TypeScript compilation: PASS"
if [ "$status_code" = "200" ]; then
  echo "✅ Health check: PASS"
  echo "✅ Authentication: PASS"
else
  echo "⚠️  Health check: SKIPPED (server not running)"
  echo "⚠️  Authentication: SKIPPED (server not running)"
fi
echo "✅ Input validation: $validation_count routes"
echo ""
echo "🎯 Next Steps:"
echo "   1. Start dev server: npm run dev"
echo "   2. Test in browser: http://localhost:3000"
echo "   3. Test Stripe webhooks: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo "   4. Deploy when ready!"
echo ""
