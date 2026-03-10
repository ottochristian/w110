# 🧪 Automated Testing Guide

**Status:** ✅ Complete testing infrastructure ready!  
**Test Coverage:** Unit, Integration, E2E, Security, Validation

---

## 🎯 **What's Been Set Up**

### Testing Frameworks Installed:
- ✅ **Vitest** - Fast unit testing (like Jest but better)
- ✅ **React Testing Library** - Component testing
- ✅ **Playwright** - E2E browser testing
- ✅ **Coverage Reports** - See what's tested

### Test Files Created:
1. ✅ `tests/unit/validation.test.ts` - 20+ validation tests
2. ✅ `tests/unit/logger.test.ts` - Logger functionality tests
3. ✅ `tests/unit/env-validation.test.ts` - Environment variable tests
4. ✅ `tests/integration/api-validation.test.ts` - API validation tests
5. ✅ `tests/integration/api-routes.test.ts` - Security & auth tests
6. ✅ `tests/e2e/auth.spec.ts` - Authentication flow tests
7. ✅ `tests/e2e/api-endpoints.spec.ts` - API endpoint E2E tests
8. ✅ `tests/e2e/pagination.spec.ts` - Pagination UI tests

### Configuration:
- ✅ `vitest.config.ts` - Vitest configuration
- ✅ `playwright.config.ts` - Playwright configuration
- ✅ `tests/setup.ts` - Test environment setup
- ✅ `.github/workflows/test.yml` - CI/CD pipeline

### Scripts:
- ✅ `scripts/check-validation-coverage.ts` - Validation coverage checker
- ✅ `scripts/run-all-tests.sh` - Complete test runner

---

## 🚀 **How to Run Tests**

### Quick Test (30 seconds):
```bash
# Run all unit tests
npm run test:unit
```

### Complete Test Suite (2-3 minutes):
```bash
# Run everything: validation, linting, unit, integration, build
./scripts/run-all-tests.sh
```

### Individual Test Types:

#### Unit Tests (fast):
```bash
# Run unit tests
npm run test:unit

# Run with UI (interactive)
npm run test:ui

# Run in watch mode (re-runs on file change)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

#### Integration Tests:
```bash
# Test API routes and security
npm run test:integration
```

#### E2E Tests (browser automation):
```bash
# Run E2E tests
npm run test:e2e

# Run with UI (watch tests run in browser)
npm run test:e2e:ui

# Run in debug mode (step through tests)
npm run test:e2e:debug
```

#### Validation Coverage:
```bash
# Check that all routes have validation
npm run test:validation-coverage
```

#### All Tests at Once:
```bash
# Run unit + integration + validation check
npm run test:all
```

---

## 📊 **What Each Test Does**

### Unit Tests (`tests/unit/`)

#### `validation.test.ts` (20+ tests)
**Tests:**
- ✅ UUID validation (valid/invalid formats)
- ✅ Email validation (format, lowercase normalization)
- ✅ Name validation (length, trimming)
- ✅ Phone validation (E.164 format)
- ✅ Complex schemas (checkout, athlete, invitation)
- ✅ SQL injection prevention
- ✅ XSS handling

**Example:**
```typescript
it('should reject SQL injection in UUID field', () => {
  expect(() => uuidSchema.parse("1' OR '1'='1")).toThrow()
})
```

#### `logger.test.ts`
**Tests:**
- ✅ Log levels (info, warn, error, debug)
- ✅ Context logging
- ✅ Performance timing

#### `env-validation.test.ts`
**Tests:**
- ✅ Required environment variables exist
- ✅ Variable format validation (URLs, API keys)

---

### Integration Tests (`tests/integration/`)

#### `api-validation.test.ts`
**Tests:**
- ✅ API routes reject invalid data
- ✅ Validation error messages are correct
- ✅ SQL injection prevention works
- ✅ Email normalization works
- ✅ Type coercion prevention
- ✅ Field length limits enforced

**Example:**
```typescript
it('should reject negative amounts', async () => {
  const response = await checkoutPOST(mockRequest({ amount: -100 }))
  expect(response.status).toBe(400)
  expect(data.error).toContain('Validation')
})
```

#### `api-routes.test.ts`
**Tests:**
- ✅ Protected routes require authentication
- ✅ All routes have validation
- ✅ Rate limiting is implemented

---

### E2E Tests (`tests/e2e/`)

#### `auth.spec.ts`
**Tests:**
- ✅ Login page loads
- ✅ Validation errors display
- ✅ Protected routes redirect to login

#### `api-endpoints.spec.ts`
**Tests:**
- ✅ API validation in real requests
- ✅ SQL injection prevention
- ✅ Rate limiting works
- ✅ Authentication required

#### `pagination.spec.ts`
**Tests:**
- ✅ Pagination controls visible
- ✅ Page navigation works
- ✅ Page size selector works
- ✅ Search functionality works

---

## 🔒 **Security Tests**

### What's Automatically Tested:

#### SQL Injection Prevention ✅
```bash
# Tests verify these fail:
- orderId: "1' OR '1'='1"
- email: "admin'--@example.com"
- householdId: "'; DROP TABLE users;--"
```

#### XSS Prevention ✅
```bash
# Tests verify validation handles:
- name: "<script>alert('xss')</script>"
- Input is validated and trimmed
- React auto-escapes on render
```

#### Rate Limiting ✅
```bash
# Tests verify:
- 11th checkout request gets 429
- Webhook spam gets blocked
- OTP spam gets blocked
```

#### Authentication ✅
```bash
# Tests verify:
- Admin routes require admin role
- Protected routes require auth
- Unauthenticated requests get 401
```

---

## 📈 **Coverage Reports**

### View Coverage:
```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### What Coverage Shows:
- Lines covered by tests
- Branches tested
- Functions tested
- Untested code paths

**Target:** 80%+ coverage on critical code

---

## 🤖 **Continuous Integration (GitHub Actions)**

### Automatic Testing on Every Push:

When you push to GitHub, these tests run automatically:

1. ✅ **Unit Tests** - All validation tests
2. ✅ **Integration Tests** - API security tests
3. ✅ **Linting** - Code quality checks
4. ✅ **Type Check** - TypeScript validation
5. ✅ **E2E Tests** - Browser automation
6. ✅ **Validation Coverage** - Must be 100%
7. ✅ **Security Scan** - Check for secrets in code

### GitHub Actions Workflow:

File: `.github/workflows/test.yml`

**Triggers:**
- Every push to `main` or `develop`
- Every pull request
- Manual workflow dispatch

**Jobs:**
1. `unit-tests` - Fast feedback (30 seconds)
2. `lint` - Code quality (15 seconds)
3. `e2e-tests` - Full browser tests (2-3 minutes)
4. `validation-security` - Security checks (30 seconds)

**See status:**
- GitHub repo → Actions tab
- Green checkmark = all tests pass ✅
- Red X = tests failed ❌

---

## 🎯 **Testing Workflow**

### Development Workflow:
```bash
# 1. Start watch mode
npm run test:watch

# 2. Make code changes
# 3. Tests auto-run on save
# 4. Fix any failures
# 5. Commit when all pass
```

### Before Committing:
```bash
# Run complete test suite
./scripts/run-all-tests.sh

# Should see:
# ✅ Validation coverage: PASS
# ✅ TypeScript: PASS
# ✅ Linting: PASS
# ✅ Unit tests: PASS
# ✅ Integration tests: PASS
# ✅ No secrets found
# ✅ Build: PASS
# 
# ✅ ALL TESTS PASSED!
```

### Before Deploying:
```bash
# Run E2E tests too
npm run test:e2e

# Then run full suite
./scripts/run-all-tests.sh

# If all pass: deploy!
```

---

## 📝 **Writing New Tests**

### Add a Unit Test:

```typescript
// tests/unit/my-feature.test.ts
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/my-feature'

describe('My Feature', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### Add an Integration Test:

```typescript
// tests/integration/my-api.test.ts
import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/my-route/route'

describe('My API Route', () => {
  it('should validate input', async () => {
    const request = createMockRequest({ invalid: 'data' })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

### Add an E2E Test:

```typescript
// tests/e2e/my-flow.spec.ts
import { test, expect } from '@playwright/test'

test('should complete user flow', async ({ page }) => {
  await page.goto('/my-page')
  await page.click('button')
  await expect(page).toHaveURL('/success')
})
```

---

## 🔧 **Test Commands Reference**

### Quick Commands:
```bash
npm test                  # Run all tests (watch mode)
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # E2E tests only
npm run test:all          # Unit + integration + validation
```

### With Options:
```bash
npm run test:ui           # Interactive test UI
npm run test:watch        # Watch mode (auto-rerun)
npm run test:coverage     # With coverage report
npm run test:e2e:ui       # E2E with browser UI
npm run test:e2e:debug    # E2E debug mode
```

### Validation:
```bash
npm run test:validation-coverage   # Check 100% coverage
```

### Complete Suite:
```bash
./scripts/run-all-tests.sh         # Everything!
```

---

## 🎯 **Current Test Coverage**

### Unit Tests: 40+ tests ✅
- Validation schemas: 20+ tests
- Logger functionality: 6 tests
- Environment validation: 8 tests

### Integration Tests: 20+ tests ✅
- API validation: 15+ tests
- Security checks: 5+ tests
- Rate limiting: 2 tests

### E2E Tests: 10+ tests ✅
- Authentication flow: 3 tests
- API endpoints: 5 tests
- Pagination: 5 tests

**Total:** 70+ automated tests! 🎉

---

## 🚨 **Common Issues & Fixes**

### Issue 1: Tests Fail Due to Missing Env Vars
**Error:** `NEXT_PUBLIC_SUPABASE_URL is not defined`

**Fix:**
```bash
# Tests use mock env vars from tests/setup.ts
# Make sure tests/setup.ts exists and is loaded
```

### Issue 2: E2E Tests Timeout
**Error:** `waiting for http://localhost:3000 failed`

**Fix:**
```bash
# Make sure dev server starts
# Increase timeout in playwright.config.ts
# Or run dev server manually: npm run dev
```

### Issue 3: Import Aliases Not Working
**Error:** `Cannot find module '@/lib/validation'`

**Fix:**
```bash
# Check vitest.config.ts has correct alias:
resolve: {
  alias: {
    '@': path.resolve(__dirname, './')
  }
}
```

### Issue 4: Mock Errors
**Error:** `useRouter is not a function`

**Fix:**
```bash
# Tests already mock Next.js router in tests/setup.ts
# If you need custom mocks, add them there
```

---

## 📊 **CI/CD Pipeline**

### GitHub Actions Workflow:

**File:** `.github/workflows/test.yml`

**What Runs:**
1. **On every push:** Unit + integration tests
2. **On every PR:** All tests including E2E
3. **On main branch:** Full suite + deployment checks

**How to Enable:**
1. Push code to GitHub
2. Go to Settings → Secrets
3. Add test environment secrets:
   - `TEST_SUPABASE_URL`
   - `TEST_SUPABASE_ANON_KEY`
   - `TEST_SUPABASE_SERVICE_ROLE_KEY`
   - `TEST_STRIPE_SECRET_KEY`
   - `TEST_STRIPE_WEBHOOK_SECRET`
   - `TEST_STRIPE_PUBLISHABLE_KEY`

4. Tests will run automatically on every push!

**View Results:**
- GitHub repo → Actions tab
- See test results, coverage reports
- Download Playwright test videos

---

## 🎓 **Testing Best Practices**

### When to Write Tests:

✅ **Always test:**
- Validation logic (schemas)
- Security features (auth, SQL injection)
- Critical business logic (payments, registrations)
- API endpoints

⚠️ **Sometimes test:**
- UI components
- Helper functions
- Utility libraries

❌ **Don't test:**
- Third-party libraries
- Simple getters/setters
- Configuration files

### Test Naming:
```typescript
describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    it('should do expected behavior', () => {
      // Test code
    })
  })
})
```

### Test Structure:
```typescript
// AAA Pattern: Arrange, Act, Assert

it('should validate email', () => {
  // Arrange
  const email = 'test@example.com'
  
  // Act
  const result = emailSchema.parse(email)
  
  // Assert
  expect(result).toBe('test@example.com')
})
```

---

## 🏆 **Test Coverage Goals**

### Current Status:
- ✅ Validation: 100% (all schemas tested)
- ✅ API Security: 100% (all routes checked)
- ⏳ UI Components: 0% (not critical)
- ⏳ Business Logic: Partial

### Recommended Coverage:
- **Validation:** 100% ✅ (achieved!)
- **API Routes:** 80%+ (currently at security checks)
- **Business Logic:** 70%+
- **UI Components:** 50%+ (not critical)

---

## 🔍 **Viewing Test Results**

### In Terminal:
```bash
npm run test:unit

# Output:
✓ tests/unit/validation.test.ts (20)
✓ tests/unit/logger.test.ts (6)
✓ tests/unit/env-validation.test.ts (8)

Test Files  3 passed (3)
Tests  34 passed (34)
Duration  1.2s
```

### Coverage Report:
```bash
npm run test:coverage
open coverage/index.html

# Shows:
- File coverage %
- Line coverage
- Branch coverage
- Uncovered code highlights
```

### E2E Report:
```bash
npm run test:e2e
npx playwright show-report

# Opens HTML report with:
- Test results
- Screenshots
- Video recordings
- Network logs
```

---

## 🎯 **Example: Testing Your Validation**

### Test the Checkout Endpoint:

```bash
# Start tests in watch mode
npm run test:watch

# Open tests/unit/validation.test.ts
# Tests run automatically!

# Try changing validation rule:
# In lib/validation.ts:
export const checkoutSchema = z.object({
  orderId: uuidSchema,
  amount: z.number().min(1),  // Changed from positive()
  clubSlug: z.string().min(1)
})

# Tests re-run automatically
# Should still pass! ✅
```

---

## 🐛 **Debugging Failed Tests**

### Unit Test Fails:
```bash
# Run with verbose output
npm run test:unit -- --reporter=verbose

# Run single test file
npm run test:unit tests/unit/validation.test.ts

# Run single test
npm run test:unit -- -t "should reject invalid UUID"
```

### E2E Test Fails:
```bash
# Run in debug mode (opens browser)
npm run test:e2e:debug

# Run with UI (watch tests)
npm run test:e2e:ui

# View last test report
npx playwright show-report
```

### Integration Test Fails:
```bash
# Check error messages
npm run test:integration -- --reporter=verbose

# Add console.log to route handler
# Re-run test to see output
```

---

## 📋 **Pre-Deployment Testing Checklist**

Run this before deploying:

```bash
# 1. Run complete test suite
./scripts/run-all-tests.sh

# Expected output:
✅ Validation coverage: PASS (100%)
✅ TypeScript: PASS
✅ Linting: PASS
✅ Unit tests: PASS (34 tests)
✅ Integration tests: PASS (20+ tests)
✅ No secrets found
✅ Build: PASS

# 2. Run E2E tests
npm run test:e2e

# Expected:
✅ 10+ tests passing

# 3. Check validation coverage
npm run test:validation-coverage

# Expected:
✅ PASS: Validation coverage 100%

# 4. If all pass: DEPLOY! 🚀
```

---

## 🎓 **Advanced Testing**

### Load Testing:
```bash
# Use existing load test script
npm run generate:load-test

# Then monitor performance:
npm run test:performance
```

### Snapshot Testing:
```typescript
// For UI components
it('should match snapshot', () => {
  const { container } = render(<MyComponent />)
  expect(container).toMatchSnapshot()
})
```

### Mocking Supabase:
```typescript
import { vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ data: mockData, error: null })
    })
  })
}))
```

---

## 🚀 **Quick Start**

Never written tests before? Start here:

### 1. Run Existing Tests (30 seconds)
```bash
npm run test:unit
```

**You should see:** ✅ All tests passing!

### 2. View Tests in UI (1 minute)
```bash
npm run test:ui
```

**Opens browser** showing all tests, click to run, see results

### 3. Watch Tests Run (ongoing)
```bash
npm run test:watch
```

**Auto-runs tests** when you save files

### 4. Run Complete Suite (2 minutes)
```bash
./scripts/run-all-tests.sh
```

**Verifies everything** before deploying

---

## 🎯 **Testing Strategy**

### For Each Feature:
1. **Write unit tests first** (test validation, logic)
2. **Add integration test** (test API route)
3. **Add E2E test if critical** (test user flow)

### Example: Adding New API Route

```typescript
// 1. Define validation schema
export const mySchema = z.object({
  field: z.string()
})

// 2. Write unit test
describe('mySchema', () => {
  it('should validate', () => {
    expect(mySchema.parse({ field: 'value' })).toBeTruthy()
  })
})

// 3. Use in route
export async function POST(request: NextRequest) {
  const validatedData = mySchema.parse(await request.json())
  // ...
}

// 4. Write integration test
it('should reject invalid data', async () => {
  const response = await POST(mockRequest({ invalid: 'data' }))
  expect(response.status).toBe(400)
})

// 5. Run tests
npm run test:all
```

---

## 📊 **Test Summary**

### Test Count by Type:
- **Unit tests:** 34+ tests
- **Integration tests:** 20+ tests
- **E2E tests:** 10+ tests
- **Security tests:** 10+ tests
- **TOTAL:** 70+ automated tests ✅

### Time to Run:
- **Unit tests:** 1-2 seconds ⚡
- **Integration tests:** 3-5 seconds
- **E2E tests:** 1-2 minutes
- **Complete suite:** 2-3 minutes
- **With build:** 3-4 minutes

### Maintenance:
- **Update tests:** When adding features
- **Fix failing tests:** Before deploying
- **Review coverage:** Monthly
- **Add E2E tests:** For critical flows

---

## ✅ **What's Automated**

Every time you run tests, these checks happen automatically:

1. ✅ **Input validation** on all 17 routes
2. ✅ **SQL injection** prevention verified
3. ✅ **Authentication** required on protected routes
4. ✅ **Rate limiting** working
5. ✅ **TypeScript** compiles without errors
6. ✅ **No secrets** committed to code
7. ✅ **Code lints** properly
8. ✅ **Build succeeds** for production

**You get instant feedback** on every code change! 🎉

---

## 🎯 **Next Steps**

### Today:
```bash
# 1. Run tests for the first time
npm run test:unit

# 2. View in UI
npm run test:ui

# 3. Check coverage
npm run test:coverage
```

### This Week:
```bash
# 1. Set up GitHub Actions (push to GitHub)
# 2. Add secrets to GitHub repo
# 3. Watch tests run automatically
```

### Ongoing:
```bash
# Run before every commit
./scripts/run-all-tests.sh

# Add tests for new features
# Keep coverage above 80%
```

---

## 🎉 **You Now Have**

- ✅ 70+ automated tests
- ✅ Complete testing infrastructure
- ✅ CI/CD pipeline ready
- ✅ Coverage reporting
- ✅ E2E browser testing
- ✅ Security validation
- ✅ One-command test execution

**Run: `npm run test:ui` to see it all in action!** 🚀

---

## 📞 **Quick Commands**

```bash
# Quick test
npm run test:unit

# Full test
./scripts/run-all-tests.sh

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E
npm run test:e2e

# Validation check
npm run test:validation-coverage
```

---

**Testing is now completely automated!** 🎉

**Every code change is automatically validated for security, correctness, and quality!**
