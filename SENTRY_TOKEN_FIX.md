# Sentry Token Permission Issue - Fix Guide 🔧

## ❌ Problem Detected

Your Sentry token is returning:
```json
{"detail":"You do not have permission to perform this action."}
```

This means the token **doesn't have the correct scopes** (permissions).

---

## ✅ Solution: Create New Token with Correct Scopes

### Step-by-Step Fix

### 1. Delete the Old Token (Optional)
Go to: https://sentry.io/settings/account/api/auth-tokens/

Find your token and click "Delete" (optional, but recommended for security)

### 2. Create New Token with CORRECT Scopes

Click **"Create New Token"**

**Critical**: You need these EXACT scopes:

#### Required Scopes ✅
- ✅ **`event:read`** - Read error events
- ✅ **`org:read`** - Read organization data  
- ✅ **`project:read`** - Read project data

#### NOT NEEDED ❌
- ❌ `event:write` - Don't need this
- ❌ `project:write` - Don't need this
- ❌ `org:write` - Don't need this

### 3. Fill in Details

**Name**: `Monitoring Dashboard API`

**Scopes** (select these 3):
```
□ event:admin
☑ event:read     ← SELECT THIS
□ event:write

□ org:admin
□ org:integrations
☑ org:read       ← SELECT THIS
□ org:write

□ project:admin
☑ project:read   ← SELECT THIS
□ project:releases
□ project:write
```

**Expiration**: Leave blank (no expiration) or set to 1 year

### 4. Copy the New Token

After clicking "Create Token", you'll see:

```
sntryu_[new token here - starts with sntryu_]
```

**Copy it immediately!** You won't see it again.

### 5. Update `.env.local`

Replace the old token with the new one:

```bash
SENTRY_AUTH_TOKEN=sntryu_[paste new token here]
```

### 6. Restart Server

I'll restart it for you once you provide the new token!

---

## 🔍 Why This Happened

The token you created might have been:
- An **Organization Auth Token** (wrong type)
- A **User Auth Token** without the correct scopes (missing `event:read`)

We need a **User Auth Token** with:
- `event:read` - To fetch error data
- `org:read` - To read organization info
- `project:read` - To read project info

---

## 📝 Screenshot Guide

When creating the token, the page should look like this:

```
Create new token
─────────────────

Name: Monitoring Dashboard API

Scopes:
  EVENT
    □ event:admin
    ☑ event:read     ← CHECK THIS
    □ event:write

  ORGANIZATION  
    □ org:admin
    □ org:integrations
    ☑ org:read       ← CHECK THIS
    □ org:write

  PROJECT
    □ project:admin
    ☑ project:read   ← CHECK THIS
    □ project:releases
    □ project:write

                        [Create Token]
```

---

## 🧪 How to Verify

After creating the new token and restarting:

1. Visit your dashboard: http://localhost:3000/system-admin/monitoring
2. Look at the **Error Feed panel** (right side)
3. You should see:
   - **If token works**: List of recent errors OR "🎉 No errors in the last 24 hours!"
   - **If token still broken**: "Sentry API integration not configured"

---

## Alternative: Check Sentry Dashboard Directly

You can always view errors directly in Sentry:
- https://sentry.io/organizations/skiadmin-9z/issues/

The monitoring dashboard is just a convenience to see errors alongside your app metrics!

---

## Next Steps

1. **Create new token** with the 3 required scopes (`event:read`, `org:read`, `project:read`)
2. **Copy the token** (starts with `sntryu_...`)
3. **Reply with the new token** and I'll update `.env.local` and restart the server
4. **Test the dashboard** - errors should appear!

---

**Ready when you are!** Get that new token and we'll get the error feed working! 🚀
