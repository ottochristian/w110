# Sentry Setup Guide

## ✅ What's Been Configured

All Sentry files and error boundaries have been created. Here's what's ready:

### Files Created:
- ✅ `sentry.client.config.ts` - Client-side error tracking
- ✅ `sentry.server.config.ts` - Server-side error tracking
- ✅ `sentry.edge.config.ts` - Edge runtime tracking
- ✅ `next.config.mjs` - Next.js integration with Sentry
- ✅ `lib/sentry-utils.ts` - Helper functions for error tracking
- ✅ `components/error-boundary.tsx` - React error boundary component
- ✅ `app/error.tsx` - Global error page

### Security Features:
- ✅ Filters sensitive data (auth tokens, cookies, emails)
- ✅ Ignores common non-critical errors (network, cancelled requests)
- ✅ Only sends errors in production (unless `SENTRY_ENABLED_IN_DEV=true`)
- ✅ Sample rate configured (10% in prod, 100% in dev)

---

## 🚀 How to Enable Sentry

### Step 1: Create a Sentry Account
1. Go to [sentry.io](https://sentry.io)
2. Sign up or log in
3. Create a new project
4. Select "Next.js" as the platform

### Step 2: Get Your Sentry DSN
After creating your project, Sentry will give you a DSN (Data Source Name). It looks like:
```
https://examplePublicKey@o0.ingest.sentry.io/0
```

### Step 3: Add Environment Variables
Add these to your `.env.local` file:

```bash
# Required
SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Optional (for source maps upload)
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=your_project_slug
SENTRY_AUTH_TOKEN=your_auth_token

# Optional (enable Sentry in development)
SENTRY_ENABLED_IN_DEV=false
```

### Step 4: Test It
1. Start your development server:
   ```bash
   npm run dev
   ```

2. Trigger a test error by adding this to any page:
   ```typescript
   <button onClick={() => {
     throw new Error('Test Sentry Error')
   }}>
     Trigger Error
   </button>
   ```

3. Click the button and check your Sentry dashboard

---

## 📊 What Sentry Will Track

### Automatic Tracking:
- ✅ **Unhandled exceptions** - JavaScript errors that crash components
- ✅ **API errors** - Failed requests and server errors
- ✅ **Performance** - Slow pages and API calls
- ✅ **User sessions** - Session replays for debugging
- ✅ **Breadcrumbs** - User actions leading to errors

### Filtered Out (Privacy):
- ❌ Email addresses
- ❌ Authorization tokens
- ❌ Cookies
- ❌ Service role keys
- ❌ IP addresses

---

## 🛠 Using Sentry in Your Code

### Basic Error Capture:
```typescript
import { captureException } from '@/lib/sentry-utils'

try {
  await riskyOperation()
} catch (error) {
  captureException(error, {
    context: 'user-registration',
    userId: user.id,
  })
  throw error
}
```

### Capture Messages:
```typescript
import { captureMessage } from '@/lib/sentry-utils'

captureMessage('Payment webhook received', 'info', {
  orderId: order.id,
  amount: order.total,
})
```

### Set User Context:
```typescript
import { setUser, clearUser } from '@/lib/sentry-utils'

// After login
setUser({
  id: user.id,
  role: user.role,
})

// After logout
clearUser()
```

### Wrap Components with Error Boundary:
```typescript
import { ErrorBoundary } from '@/components/error-boundary'

export default function MyPage() {
  return (
    <ErrorBoundary>
      <MyRiskyComponent />
    </ErrorBoundary>
  )
}
```

### Or use HOC:
```typescript
import { withErrorBoundary } from '@/components/error-boundary'

const MyComponent = () => {
  // component code
}

export default withErrorBoundary(MyComponent)
```

---

## 📈 Sentry Dashboard

Once enabled, you'll see:

1. **Issues** - All errors grouped by type
2. **Performance** - Slow pages and API calls
3. **Replays** - Video-like recordings of user sessions when errors occur
4. **Releases** - Track errors by deployment version
5. **Alerts** - Get notified of new errors via email/Slack

---

## 🎯 Next Steps

1. **Create Sentry account** (5 min)
2. **Add DSN to `.env.local`** (1 min)
3. **Deploy and monitor** - Sentry will start capturing errors
4. **Set up alerts** - Configure Slack/email notifications
5. **Review errors weekly** - Track and fix issues proactively

---

## 💡 Tips

- **Start with low sample rate** (10%) to avoid overwhelming alerts
- **Set up integrations** with Slack, Jira, or GitHub for better workflow
- **Use releases** to track which deployment introduced bugs
- **Review session replays** - they're incredibly helpful for debugging
- **Set up alerts** for critical errors (payment failures, auth issues)

---

## 🔍 Troubleshooting

### Sentry not capturing errors?
1. Check `SENTRY_DSN` is set in `.env.local`
2. Verify you're in production OR `SENTRY_ENABLED_IN_DEV=true`
3. Check Sentry dashboard for test events
4. Look for console errors about Sentry initialization

### Too many errors?
1. Adjust `tracesSampleRate` in sentry configs (lower = fewer events)
2. Add more patterns to `ignoreErrors` array
3. Filter out specific error types in Sentry dashboard

### Source maps not working?
1. Add `SENTRY_AUTH_TOKEN` to `.env.local`
2. Set `SENTRY_ORG` and `SENTRY_PROJECT`
3. Run `npm run build` to upload source maps

---

That's it! Sentry is now ready to go. Just add your DSN and you're live. 🎉
