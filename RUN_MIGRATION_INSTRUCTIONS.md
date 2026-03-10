# Run Monitoring Migration - Instructions

## 🎯 Goal
Apply the `60_add_application_metrics.sql` migration to create the monitoring infrastructure.

## 📍 Your Supabase Project
**Project**: hlclvdddefuwggwtmlzc  
**Dashboard**: https://supabase.com/dashboard/project/hlclvdddefuwggwtmlzc

---

## ✅ Easiest Method: Supabase Dashboard

### Step 1: Open SQL Editor
Click this link to go directly to your SQL editor:
**https://supabase.com/dashboard/project/hlclvdddefuwggwtmlzc/sql**

### Step 2: Create New Query
1. Click "New Query" button
2. Name it: "Add Application Metrics"

### Step 3: Copy Migration SQL
Open this file in your editor:
```
migrations/60_add_application_metrics.sql
```

Or run this command to copy it:
```bash
cat migrations/60_add_application_metrics.sql | pbcopy
```

### Step 4: Paste and Run
1. Paste the entire SQL content into the query editor
2. Click the **"RUN"** button (or press Cmd+Enter)
3. Wait for "Success" message

### Step 5: Verify
Run this query to verify the table was created:
```sql
SELECT COUNT(*) FROM application_metrics;
```

Should return a count (likely 5 sample metrics).

---

## 🔧 Alternative: Install Supabase CLI

### Step 1: Install CLI
```bash
brew install supabase/tap/supabase
```

### Step 2: Login
```bash
supabase login
```

### Step 3: Link Project
```bash
supabase link --project-ref hlclvdddefuwggwtmlzc
```

### Step 4: Push Migration
```bash
supabase db push
```

---

## 🚀 After Migration Runs

### Test the Monitoring Dashboard

1. **Restart your dev server** (if running):
   ```bash
   npm run dev
   ```

2. **Visit the monitoring page**:
   ```
   http://localhost:3000/system-admin/monitoring
   ```

3. **You should see**:
   - 6 health cards
   - Real-time status indicators
   - System metrics

### If You See Errors

**"Table doesn't exist"**:
- Migration didn't run
- Re-check SQL editor for errors

**"Permission denied"**:
- RLS policy issue
- Make sure you're logged in as system_admin

**"No data"**:
- Expected! Data will populate as your app runs
- You can manually insert test data:
  ```sql
  INSERT INTO application_metrics (metric_name, metric_value, metadata, severity)
  VALUES ('test.metric', 100, '{"source": "manual"}', 'info');
  ```

---

## 📊 What the Migration Creates

### Tables:
- `application_metrics` - Main metrics storage

### Views:
- `metrics_last_24h` - Aggregated metrics summary

### Functions:
- `cleanup_old_metrics()` - Auto-cleanup (30 days)

### Indexes:
- Fast queries on metric_name and recorded_at
- Optimized for dashboard performance

### Sample Data:
- 5 test metrics to verify setup

---

## ⚠️ Troubleshooting

### Error: "relation already exists"
**Solution**: Table already created! You're good to go.

### Error: "permission denied"
**Solution**: Make sure you're using your Supabase dashboard (logged in).

### Error: "syntax error"
**Solution**: Make sure you copied the ENTIRE file, including all semicolons.

---

## ✅ Success Checklist

- [ ] Migration SQL runs without errors
- [ ] `SELECT COUNT(*) FROM application_metrics;` returns a number
- [ ] Monitoring dashboard loads at `/system-admin/monitoring`
- [ ] Health cards show data (or "not_configured" for some services)

---

**Need help?** Check the Supabase logs for detailed error messages.
