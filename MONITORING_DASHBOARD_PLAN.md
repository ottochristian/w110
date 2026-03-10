# Super Admin Monitoring & Health Dashboard

## 🎯 Goal
**Track 90% of the app proactively** to catch issues before users see them.

---

## 📊 Proposed Solution: Multi-Layer Monitoring

### Layer 1: Real-Time Health Checks ✅ (Already Built)
**What**: `/api/health` endpoint
**Current Status**: Basic checks (database, env vars)
**Enhancement Needed**: Expand to comprehensive health monitoring

### Layer 2: Error Tracking (Sentry) ⚠️ (Partially Set Up)
**What**: Captures every error, trace, and performance issue
**Current Status**: Configured but not fully integrated
**Why You Need It**: 
- Automatic error capture across the entire app
- Performance monitoring (slow queries, API latency)
- Release tracking (know which deploy broke what)
- User context (which users hit errors)
- Stack traces and breadcrumbs

### Layer 3: Custom Application Metrics (NEW) 🆕
**What**: Business logic health indicators
**Examples**:
- Registration success rate
- Payment completion rate
- Failed webhook deliveries
- Email/SMS delivery failures
- Database query performance
- API endpoint response times

### Layer 4: Real-Time Dashboard (NEW) 🆕
**What**: Super admin page showing live health stats
**Location**: `/system-admin/monitoring`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│           Super Admin Dashboard                  │
│     /system-admin/monitoring                     │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Health   │ │  Errors  │ │  Metrics │       │
│  │ Status   │ │  (Sentry)│ │ (Custom) │       │
│  └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ /api/health │ │ Sentry API  │ │ Supabase    │
│  endpoint   │ │             │ │ metrics     │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## 📋 Implementation Plan

### Part 1: Enhanced Health Checks
**Expand `/api/health` to monitor:**
- ✅ Database connectivity (current)
- 🆕 Supabase RLS policies active
- 🆕 Critical tables accessible
- 🆕 Stripe API connectivity
- 🆕 Recent webhook success rate
- 🆕 Email service (SendGrid/Resend)
- 🆕 SMS service (Twilio)
- 🆕 Recent error rate (last 5 min)
- 🆕 API response time averages

### Part 2: Application Metrics Table
**Create new Supabase table: `application_metrics`**

```sql
CREATE TABLE application_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMP DEFAULT NOW(),
  severity TEXT CHECK (severity IN ('info', 'warning', 'error'))
);

-- Index for fast queries
CREATE INDEX idx_metrics_name_time ON application_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_metrics_severity_time ON application_metrics(severity, recorded_at DESC);
```

**Tracked Metrics**:
- `registration.created` (count per hour)
- `registration.failed` (with error reason)
- `payment.succeeded` (count + amount)
- `payment.failed` (with error reason)
- `webhook.received` (event type)
- `webhook.failed` (event type + error)
- `email.sent` (count)
- `email.failed` (with error)
- `api.response_time` (endpoint + duration)
- `database.query_time` (query type + duration)

### Part 3: Metric Collection Helpers
**Create `lib/metrics.ts`**

```typescript
export async function recordMetric(
  name: string,
  value: number,
  metadata?: Record<string, any>,
  severity: 'info' | 'warning' | 'error' = 'info'
) {
  // Non-blocking: fire and forget
  // Store in Supabase + optionally send to Sentry
}

export async function trackApiCall(
  endpoint: string,
  duration: number,
  statusCode: number
) {
  if (duration > 5000) { // Slow API call
    await recordMetric('api.slow_response', duration, { endpoint, statusCode }, 'warning')
  }
}

export async function trackError(
  source: string,
  error: Error,
  metadata?: Record<string, any>
) {
  await recordMetric('error.occurred', 1, { 
    source, 
    message: error.message,
    ...metadata 
  }, 'error')
  
  // Also send to Sentry
  Sentry.captureException(error, { tags: { source }, extra: metadata })
}
```

### Part 4: Super Admin Dashboard Page
**Create `/app/system-admin/monitoring/page.tsx`**

**Features**:
1. **System Health Cards**
   - Database: ✅ Healthy
   - Stripe: ✅ Connected
   - Email: ⚠️ 2 failures in last hour
   - SMS: ✅ Operational

2. **Real-Time Error Feed**
   - Last 50 errors from Sentry
   - Click to see details

3. **Key Metrics (Last 24 Hours)**
   - Registrations: 147 (↑ 12%)
   - Payments: $12,450 (↑ 8%)
   - Failed Payments: 3 (→)
   - API Avg Response Time: 234ms

4. **Alerts & Warnings**
   - 🔴 Critical: Payment webhook failed 3x
   - ⚠️ Warning: Slow query detected on `/api/athletes`
   - ✅ All systems operational

5. **Quick Actions**
   - Retry failed webhooks
   - View error logs
   - Test integrations

### Part 5: Automated Alerting (Optional)
**When metrics exceed thresholds, send alerts via:**
- Email to admins
- Slack webhook
- SMS for critical issues

**Example Thresholds**:
- Error rate > 10/minute → Alert
- Payment failure rate > 5% → Alert
- API response time > 5s → Alert
- Webhook failures > 3 in 10 min → Alert

---

## 🔧 Do You Need Sentry?

### **YES** - Here's Why:

#### What Sentry Gives You (That Custom Metrics Can't):
1. **Automatic Error Capture**
   - Every unhandled exception
   - Promise rejections
   - Console errors
   - React component errors

2. **Performance Monitoring**
   - Database query traces
   - API endpoint waterfall
   - Slow transaction detection
   - Memory leaks

3. **User Context**
   - Which user hit the error
   - What actions they took before
   - Browser/device info
   - Session replay (optional)

4. **Stack Traces & Source Maps**
   - Exact line of code that failed
   - Full call stack
   - Variable values at error time

5. **Release Tracking**
   - Know which deploy introduced a bug
   - Compare error rates across releases

6. **Alerting**
   - Configurable alerts (email, Slack, PagerDuty)
   - Anomaly detection (sudden spike in errors)

### Custom Metrics vs Sentry

| Feature | Custom Metrics | Sentry |
|---------|---------------|--------|
| Business KPIs | ✅ Better | ❌ |
| Error tracking | ⚠️ Manual | ✅ Automatic |
| Performance traces | ⚠️ Basic | ✅ Deep |
| User context | ⚠️ Manual | ✅ Automatic |
| Stack traces | ❌ | ✅ |
| Source maps | ❌ | ✅ |
| Release tracking | ❌ | ✅ |
| Alerting | ⚠️ DIY | ✅ Built-in |

### **Recommendation: Use Both**
- **Sentry**: Error tracking, performance, user context
- **Custom Metrics**: Business-specific health (registrations, payments, webhooks)

---

## 📈 Expected Coverage

With this implementation:
- ✅ **100% error capture** (via Sentry)
- ✅ **95%+ app health visibility** (via health checks + metrics)
- ✅ **Real-time monitoring** (dashboard updates every 30s)
- ✅ **Proactive alerting** (know before users complain)

---

## 🚀 Implementation Steps

1. **Expand health endpoint** (30 min)
2. **Create metrics table & helpers** (1 hour)
3. **Instrument critical paths** (2 hours)
   - Wrap payment flows
   - Wrap webhook handlers
   - Wrap email/SMS sending
4. **Build monitoring dashboard** (3 hours)
5. **Set up Sentry fully** (1 hour)
   - Enable performance monitoring
   - Configure alerts
   - Test error capture
6. **Add alerting logic** (1 hour)

**Total**: ~8 hours of focused work

---

## 💰 Cost Estimate

### Sentry
- Free tier: 5K errors/month, 10K transactions/month
- Recommended: **Developer plan $26/month**
  - 50K errors
  - 100K performance transactions
  - 1-day data retention

### Custom Metrics Storage
- Supabase: Minimal cost (1-2MB per day of metrics)
- ~$0-5/month at current scale

**Total Monthly Cost**: ~$26-31/month

---

## 🎯 Benefits

1. **Catch issues before users**
   - Failed payments? You know immediately
   - Webhook failures? Auto-retry
   - Slow API? Get alerted

2. **Debugging superpowers**
   - Full stack traces
   - User breadcrumbs
   - Performance bottlenecks

3. **Confidence in releases**
   - Compare error rates before/after deploy
   - Rollback quickly if needed

4. **Business insights**
   - Registration funnel drop-offs
   - Payment success rates
   - System load patterns

---

## 🤔 Your Decision

**Which parts do you want to implement?**

### Option A: Full Stack (Recommended)
- Enhanced health checks
- Custom metrics table
- Monitoring dashboard
- Sentry integration
- Automated alerts

**Coverage**: 95%+ of app
**Time**: ~8 hours
**Cost**: $26/month

### Option B: Essentials Only
- Enhanced health checks
- Custom metrics table
- Basic monitoring dashboard
- Skip Sentry for now

**Coverage**: 70% of app
**Time**: ~4 hours
**Cost**: $0/month

### Option C: Sentry + Basic Dashboard
- Sentry integration
- Simple dashboard showing Sentry data
- Basic health checks

**Coverage**: 85% of app
**Time**: ~3 hours
**Cost**: $26/month

---

**What would you like to do?** 🚀
