# API Authentication Audit Results

**Date:** March 9, 2026  
**Total Routes:** 44

---

## 📊 Summary

- **Authenticated:** 31 routes ✅
- **Public (intentional):** 6 routes 🌐
- **Missing auth (needs review):** 7 routes ⚠️
- **Manual auth (needs migration):** 23 routes 📝

---

## ❌ CRITICAL: Routes Missing Authentication

### Analysis: Are These Security Risks?

#### 1. `/api/auth/complete-invitation-signup` 
**Status:** ⚠️ Needs token validation  
**Current:** No auth  
**Should be:** Public but validate invitation token  
**Risk:** Medium - Could be abused without token validation
**Action:** Add token validation from invitation

#### 2. `/api/auth/create-session-after-verification`
**Status:** ⚠️ Needs token validation  
**Current:** No auth  
**Should be:** Public but validate OTP/verification token  
**Risk:** Medium - Session creation without verification check
**Action:** Add OTP verification check

#### 3. `/api/auth/setup-password` & `/api/auth/setup-password-secure`
**Status:** ⚠️ Needs token validation  
**Current:** No auth  
**Should be:** Public but validate reset token  
**Risk:** Medium - Password reset without proper token validation
**Action:** Validate setup/reset tokens

#### 4. `/api/clubs/:clubId/slug`
**Status:** ✅ OK to be public  
**Current:** No auth  
**Should be:** Public (returns non-sensitive data)  
**Risk:** Low - Just returns slug, but could be rate limited
**Action:** Add rate limiting

#### 5. `/api/otp/send`
**Status:** ❌ SECURITY RISK  
**Current:** No auth, has DB rate limiting  
**Should be:** Requires authentication OR stronger rate limiting  
**Risk:** HIGH - Could spam OTPs to any user
**Action:** Add authentication or stricter rate limiting

#### 6. `/api/otp/verify`
**Status:** ✅ OK to be public (part of auth flow)  
**Current:** No auth  
**Should be:** Public but validate OTP  
**Risk:** Low - OTP validation is the auth mechanism
**Action:** Add rate limiting, ensure OTP validation is robust

---

## 🔧 FIXES REQUIRED

### Priority 1: Add Authentication/Validation (Critical)

#### Fix `/api/otp/send` - HIGH RISK
```typescript
// Current: Anyone can send OTP to any userId
// Fix: Require authentication OR use email/phone as key with strict rate limit

export async function POST(request: NextRequest) {
  // Add authentication
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }
  
  // OR validate that userId matches current user
  // ...existing code
}
```

#### Fix Auth Routes - Token Validation
```typescript
// All /api/auth/* routes need token validation:
// - complete-invitation-signup: Validate invitation token
// - setup-password: Validate password reset token
// - create-session-after-verification: Validate OTP was verified
```

### Priority 2: Migrate Manual Auth (23 routes)

All `/api/admin/*` routes use manual `supabase.auth.getUser()`:

**Pattern to replace:**
```typescript
// OLD
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// NEW
const authResult = await requireAuth(request)
if (authResult instanceof NextResponse) {
  return authResult
}
const { user, supabase } = authResult
```

**Benefits:**
- Consistent error handling
- Better logging
- Role checking support
- Less boilerplate

---

## 📋 ACTION PLAN

### Step 1: Fix Critical Security Issues (1 hour)
- [ ] Add auth to `/api/otp/send` (or stricter rate limit)
- [ ] Add token validation to invitation signup
- [ ] Add token validation to password reset
- [ ] Add token validation to session creation
- [ ] Add rate limiting to OTP verify

### Step 2: Migrate Admin Routes to requireAuth (2 hours)
Create migration script:
```bash
scripts/migrate-auth-helpers.sh
```

Migrate these 23 routes:
- [ ] All `/api/admin/athletes/*` (4 routes)
- [ ] All `/api/admin/programs/*` (2 routes)
- [ ] All `/api/admin/registrations/*` (4 routes)
- [ ] All `/api/admin/revenue/*` (5 routes)
- [ ] All `/api/admin/waivers/*` (5 routes)
- [ ] `/api/admin/users/:userId/last-sign-in`
- [ ] `/api/athletes/admin-create`
- [ ] `/api/system-admin/invite-admin`

### Step 3: Add Rate Limiting to Remaining Routes (30 min)
- [ ] All admin analytics routes
- [ ] All auth routes
- [ ] OTP routes (already has DB rate limit, verify it works)

### Step 4: Add Input Validation (30 min)
- [ ] Add validation schemas for remaining routes
- [ ] Validate all request bodies
- [ ] Validate all query parameters

---

## 🎯 IMMEDIATE ACTION: Fix OTP Send Route

**This is the most critical security issue.**

Current state:
```typescript
// Anyone can POST to /api/otp/send with any userId
// Could spam OTPs to users
```

Two options:

**Option A: Require Authentication (Recommended)**
```typescript
const authResult = await requireAuth(request)
// Only authenticated users can request OTPs for themselves
```

**Option B: Public with Strict Token + Rate Limit**
```typescript
// Validate invitation/setup token
// Rate limit: 3 per hour per email/phone
```

Which approach makes sense for your use case?

---

## 📊 Statistics

### Security Coverage:
- **Protected:** 37/44 routes (84%)
- **Unprotected:** 7/44 routes (16%)
  - Intentionally public: 6 routes
  - Security risk: 1 route (OTP send)

### Best Practices Compliance:
- **Using auth helpers:** 8 routes (18%)
- **Manual auth:** 23 routes (52%)
- **No auth (public):** 13 routes (30%)

### Rate Limiting Coverage:
- **Has rate limiting:** 3 routes (7%)
- **Needs rate limiting:** 41 routes (93%)

### Input Validation Coverage:
- **Has validation:** 3 routes (7%)
- **Needs validation:** ~30 routes (68%)

---

## 🚀 NEXT STEPS

1. **Right now:** Fix `/api/otp/send` security issue
2. **Today:** Migrate 5 most-used admin routes to requireAuth
3. **Tomorrow:** Migrate remaining 18 admin routes
4. **This week:** Add validation to all routes accepting input

**Estimated time to complete all:** ~5 hours total

Would you like me to fix the OTP send security issue first?
