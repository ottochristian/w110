#!/bin/bash
# Comprehensive test runner

set -e  # Exit on any error

echo "🧪 Running Complete Test Suite"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# 1. Validation Coverage Check
echo "1️⃣  Checking validation coverage..."
if npm run test:validation-coverage > /tmp/validation-check.log 2>&1; then
  echo -e "   ${GREEN}✅ Validation coverage: PASS${NC}"
  cat /tmp/validation-check.log | grep "Coverage:"
else
  echo -e "   ${RED}❌ Validation coverage: FAIL${NC}"
  cat /tmp/validation-check.log
  FAILURES=$((FAILURES + 1))
fi
echo ""

# 2. TypeScript Check
echo "2️⃣  Type checking TypeScript..."
if npx tsc --noEmit > /tmp/tsc-check.log 2>&1; then
  echo -e "   ${GREEN}✅ TypeScript: PASS${NC}"
else
  echo -e "   ${RED}❌ TypeScript: FAIL${NC}"
  tail -20 /tmp/tsc-check.log
  FAILURES=$((FAILURES + 1))
fi
echo ""

# 3. Linting
echo "3️⃣  Running linter..."
if npm run lint > /tmp/lint-check.log 2>&1; then
  echo -e "   ${GREEN}✅ Linting: PASS${NC}"
else
  echo -e "   ${YELLOW}⚠️  Linting: WARNINGS${NC}"
  echo "   (Run 'npm run lint' to see details)"
fi
echo ""

# 4. Unit Tests
echo "4️⃣  Running unit tests..."
if npm run test:unit > /tmp/unit-tests.log 2>&1; then
  echo -e "   ${GREEN}✅ Unit tests: PASS${NC}"
  cat /tmp/unit-tests.log | grep -E "Test Files|Tests|Duration" || true
else
  echo -e "   ${RED}❌ Unit tests: FAIL${NC}"
  tail -30 /tmp/unit-tests.log
  FAILURES=$((FAILURES + 1))
fi
echo ""

# 5. Integration Tests
echo "5️⃣  Running integration tests..."
if npm run test:integration > /tmp/integration-tests.log 2>&1; then
  echo -e "   ${GREEN}✅ Integration tests: PASS${NC}"
  cat /tmp/integration-tests.log | grep -E "Test Files|Tests|Duration" || true
else
  echo -e "   ${RED}❌ Integration tests: FAIL${NC}"
  tail -30 /tmp/integration-tests.log
  FAILURES=$((FAILURES + 1))
fi
echo ""

# 6. Security Checks
echo "6️⃣  Running security checks..."
echo "   Checking for secrets in code..."
if grep -r "sk_live_\|pk_live_\|whsec_" app/ lib/ components/ 2>/dev/null; then
  echo -e "   ${RED}❌ Found potential secrets in code!${NC}"
  FAILURES=$((FAILURES + 1))
else
  echo -e "   ${GREEN}✅ No secrets found${NC}"
fi
echo ""

# 7. Build Test
echo "7️⃣  Testing production build..."
if npm run build > /tmp/build-test.log 2>&1; then
  echo -e "   ${GREEN}✅ Build: PASS${NC}"
  BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "N/A")
  echo "   Build size: $BUILD_SIZE"
else
  echo -e "   ${RED}❌ Build: FAIL${NC}"
  tail -30 /tmp/build-test.log
  FAILURES=$((FAILURES + 1))
fi
echo ""

# Summary
echo "=============================="
echo "📊 Test Results Summary"
echo "=============================="
echo ""

if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo ""
  echo "Your app is ready to deploy! 🚀"
  exit 0
else
  echo -e "${RED}❌ $FAILURES TEST(S) FAILED${NC}"
  echo ""
  echo "Please fix the failures above before deploying."
  exit 1
fi
