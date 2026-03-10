# Critical Fixes Implementation Checklist

**Goal:** Fix all critical security, production blocker, and UX issues  
**Status:** In Progress  
**Started:** March 9, 2026

---

## 🔴 CRITICAL SECURITY (Do First)

### ✅ 1. Webhook Idempotency
**Status:** ⏳ In Progress  
**Time:** 1 hour  
**Risk if not fixed:** Duplicate payments, double charges

**Steps:**
- [x] Create webhook_events table migration
- [ ] Update webhook route to check for duplicates
- [ ] Test with Stripe CLI
- [ ] Deploy to production

**Files:**
- `migrations/28_add_webhook_events_table.sql` (exists)
- `app/api/webhooks/stripe/route.ts` (needs update)

---

### 2. Rate Limiting
**Status:** 📋 Ready to start  
**Time:** 2 hours  
**Risk if not fixed:** DDoS, brute force attacks

**Steps:**
- [ ] Install rate limiting library
- [ ] Add rate limit to checkout endpoint
- [ ] Add rate limit to login/signup
- [ ] Test with multiple requests
- [ ] Configure limits per environment

**Target Endpoints:**
- `/api/checkout` - 10/min per user
- `/api/auth/*` - 5/min per IP
- `/api/webhooks/stripe` - 100/min per IP

---

### 3. Input Validation
**Status:** 📋 Ready to start  
**Time:** 2 hours  
**Risk if not fixed:** SQL injection, XSS attacks

**Steps:**
- [ ] Install zod validation library
- [ ] Create validation schemas
- [ ] Add validation to API routes
- [ ] Add sanitization helpers
- [ ] Test with malicious inputs

**Priority Routes:**
- `/api/checkout`
- `/api/athletes/create`
- `/api/household-guardians/invite`

---

### 4. API Authentication Audit
**Status:** 📋 Ready to start  
**Time:** 3 hours  
**Risk if not fixed:** Unauthorized access to data

**Steps:**
- [ ] Audit all API routes for auth
- [ ] Add auth to unprotected routes
- [ ] Standardize auth patterns
- [ ] Test auth failures
- [ ] Document auth requirements

**Known Gaps:**
- Some admin routes may lack auth checks
- Service role key used in places it shouldn't be

---

## 🚨 PRODUCTION BLOCKERS (Do Second)

### 5. Environment Validation
**Status:** 📋 Ready to start  
**Time:** 30 minutes  
**Risk if not fixed:** Runtime failures, hard to debug

**Steps:**
- [ ] Create env.ts validation file
- [ ] Add startup validation
- [ ] Test with missing vars
- [ ] Add to documentation
- [ ] Fail fast with clear errors

---

### 6. Error Monitoring (Sentry)
**Status:** 📋 Ready to start  
**Time:** 1 hour  
**Risk if not fixed:** Can't debug production issues

**Steps:**
- [ ] Create Sentry account
- [ ] Install @sentry/nextjs
- [ ] Run Sentry wizard
- [ ] Configure error tracking
- [ ] Test error capture
- [ ] Set up alerts

---

### 7. Health Check Endpoint
**Status:** ✅ Exists (needs testing)  
**Time:** 15 minutes  
**Risk if not fixed:** Can't monitor uptime

**Steps:**
- [x] Endpoint created at /api/health
- [ ] Test endpoint
- [ ] Verify database check
- [ ] Add to uptime monitoring
- [ ] Document for ops team

---

### 8. Logging Infrastructure
**Status:** 📋 Ready to start  
**Time:** 1 hour  
**Risk if not fixed:** Can't troubleshoot issues

**Steps:**
- [ ] Create logger utility
- [ ] Add structured logging
- [ ] Log critical events
- [ ] Configure log levels
- [ ] Test log output

---

## 👥 USER-FACING ISSUES (Do Third)

### 9. Pagination on Other Pages
**Status:** 📋 Ready to start  
**Time:** 3-4 hours  
**Risk if not fixed:** Timeouts with large datasets

**Pages to fix:**
- [ ] Registrations page (`app/clubs/[clubSlug]/admin/registrations/page.tsx`)
- [ ] Orders page (if not paginated)
- [ ] Coaches page (if applicable)
- [ ] Parent programs view

---

### 10. Loading States/Skeletons
**Status:** 📋 Ready to start  
**Time:** 2 hours  
**Risk if not fixed:** Poor UX, looks broken

**Components needed:**
- [ ] Table skeleton loader
- [ ] Card skeleton loader
- [ ] Form skeleton loader
- [ ] Add to all data fetching components

---

### 11. Error Boundaries
**Status:** 📋 Ready to start  
**Time:** 1 hour  
**Risk if not fixed:** App crashes without recovery

**Steps:**
- [ ] Create error boundary component
- [ ] Add to root layout
- [ ] Add to route groups
- [ ] Test error scenarios
- [ ] Add error logging

---

## 📊 PROGRESS TRACKER

### By Category:
- **Security:** 0/4 complete (0%)
- **Production:** 1/4 complete (25%)
- **UX:** 0/3 complete (0%)

### Overall:
- **Total Items:** 11
- **Completed:** 1
- **In Progress:** 1
- **Remaining:** 9
- **Estimated Total Time:** 16-19 hours

---

## 🎯 SESSION PLAN

### Session 1 (Today - 3 hours):
1. ✅ Webhook idempotency (1 hour)
2. Rate limiting (2 hours)

### Session 2 (Tomorrow - 3 hours):
3. Input validation (2 hours)
4. Environment validation (30 min)
5. Health check testing (15 min)
6. Start API auth audit (15 min)

### Session 3 (Day 3 - 3 hours):
7. Complete API auth audit (2.5 hours)
8. Logging infrastructure (30 min)

### Session 4 (Day 4 - 3 hours):
9. Sentry setup (1 hour)
10. Pagination on registrations (2 hours)

### Session 5 (Day 5 - 4 hours):
11. Remaining pagination (2 hours)
12. Loading states (2 hours)

### Session 6 (Day 6 - 2 hours):
13. Error boundaries (1 hour)
14. Final testing (1 hour)

**Total:** 18 hours across 6 sessions

---

## 🔧 TESTING PLAN

After each fix:
- [ ] Unit test (if applicable)
- [ ] Manual testing
- [ ] Edge case testing
- [ ] Document what was fixed
- [ ] Update this checklist

---

## 📝 NOTES

- Check off items as completed
- Add notes for anything unusual
- Link to commits/PRs
- Track any new issues found

---

**Let's do this systematically and get everything production-ready!** 🚀
