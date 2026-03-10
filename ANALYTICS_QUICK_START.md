# Analytics Overview - Quick Start Guide

## 🚀 How to Test Right Now

### Step 1: Start the Dev Server (if not running)
```bash
npm run dev
```

### Step 2: Navigate to Analytics
In your browser, go to:
```
http://localhost:3000/clubs/{your-club-slug}/admin/analytics
```

**Examples:**
- `http://localhost:3000/clubs/gtssf/admin/analytics`
- `http://localhost:3000/clubs/jackson/admin/analytics`

### Step 3: You Should See
1. ✅ **Filter bar** at the top (season selector, compare dropdown)
2. ✅ **4 hero metric cards** (Revenue, Registrations, Athletes, Outstanding)
3. ✅ **4 charts:**
   - Registrations by Program (horizontal bars)
   - Registration Status (pie chart)
   - Revenue by Program (horizontal bars)
   - Program Performance (summary metrics)
4. ✅ **Quick Insights** panel (actionable alerts)

---

## 🎨 What to Look For

### If You Have Data:
- Numbers should be real (not 0)
- Program names should match your actual programs
- Charts should be colorful and distinct
- Trends should show (if you select a comparison season)

### If Charts Are Empty:
- Check that you have registrations in the current season
- Check that sub_programs are linked to programs
- Check browser console for API errors

---

## 🔍 Troubleshooting

### "No data available" in charts
**Cause:** No registrations exist for the current season
**Fix:** 
1. Check season selector (is the right season selected?)
2. Add test registrations via parent portal
3. Verify season is marked as `is_current = true`

### "Loading..." never finishes
**Cause:** API error or authentication issue
**Fix:**
1. Open browser DevTools (F12) → Network tab
2. Look for failed API calls to `/api/admin/registrations/`
3. Check response for error message
4. Verify you're logged in as an admin

### Charts show but colors are all the same
**Cause:** This shouldn't happen with our implementation
**Check:** 
- Browser console for React errors
- Make sure Recharts library is installed: `npm install recharts`

### "Season: No season selected"
**Cause:** Season context not loading
**Fix:**
1. Go to admin settings → Seasons
2. Mark one season as "Current"
3. Refresh the analytics page

---

## 📊 Test Scenarios

### Scenario 1: Compare Seasons
1. Click "Compare to" dropdown
2. Select a previous season
3. Watch hero metrics update with trend arrows
4. Arrows should point ↑ (up) if current season is doing better

### Scenario 2: Export Data (Not Yet Implemented)
1. Click "Export Overview" button
2. Currently: Opens console log
3. TODO: Should download CSV file

### Scenario 3: Advanced Filters (Not Yet Hooked Up)
1. Click "Show Advanced Filters"
2. Select a program/status
3. Currently: UI only, doesn't filter data
4. TODO: Should update charts

---

## 🎯 Demo Script (For Showing to Clubs)

### Opening (30 seconds)
"Let me show you the new analytics dashboard. This is what you'll see when you log in as an admin."

### Hero Metrics (1 minute)
"Right at the top, you see your key numbers:
- **$142K in revenue** for this season
- **287 active registrations** (245 confirmed, 32 pending)
- **287 athletes** across 145 households
- **$8,450 outstanding** from 23 households"

**If you have comparison data:**
"And here's the cool part - we're up 12% vs last season. These green arrows show you're trending in the right direction."

### Charts (2 minutes)
"Below that, you can see:
1. **Which programs are most popular** - Alpine Devo leads with 85 athletes
2. **Where everyone's at** - 85% confirmed, 11% pending, 4% waitlisted
3. **Where your revenue's coming from** - Alpine programs generating $89K
4. **Quick performance summary** - 12 programs, averaging 24 athletes each"

### Insights (1 minute)
"And down here, the system highlights what needs your attention:
- **32 pending registrations** to review
- **10 athletes on waitlists** - consider expanding capacity
- **$8,450 outstanding** - 23 households need payment follow-up"

### Closing (30 seconds)
"This updates in real-time. As parents register, pay, or get added to waitlists, you see it immediately. And you can export any of this to CSV for board meetings."

**Total Demo Time:** ~5 minutes

---

## 🔗 Related Files

If you need to modify something:

**Filter Bar:**
```
/components/admin/analytics/filter-bar.tsx
```

**Hero Metrics:**
```
/components/admin/analytics/hero-metrics.tsx
```

**Overview Page:**
```
/app/clubs/[clubSlug]/admin/analytics/page.tsx
```

**Navigation:**
```
/components/admin-sidebar.tsx
```

---

## 💬 Common Questions

### Q: Can I change the colors?
**A:** Yes! Edit the `PROGRAM_COLORS` array in `page.tsx`:
```tsx
const PROGRAM_COLORS = [
  '#3B82F6', // blue - change to your club color
  '#10B981', // green
  // ...
]
```

### Q: Can I show more than 8 programs?
**A:** Yes! In `page.tsx`, change:
```tsx
.slice(0, 8) // Change 8 to whatever number you want
```

### Q: Can I add my club logo?
**A:** The club logo already appears in the sidebar (from club context). To add to the page, import `useClub()` and render `club.logo_url`.

### Q: Where does the data come from?
**A:** Two API endpoints:
1. `/api/admin/registrations/summary` (for metrics)
2. `/api/admin/registrations/by-sport` (for program breakdown)

Both use your existing database with RLS security.

---

## ✅ Checklist Before Demo

- [ ] Dev server running (`npm run dev`)
- [ ] Logged in as admin
- [ ] Current season selected
- [ ] At least some test registrations exist
- [ ] Browser DevTools open (just in case)
- [ ] Have previous season data (for comparison demo)
- [ ] Know your club slug (for URL)

---

## 🎉 You're Ready!

Navigate to: `http://localhost:3000/clubs/{your-club-slug}/admin/analytics`

And see your analytics come to life!

**Questions?** Check the console logs or inspect Network tab in DevTools.

**Next Steps:** Add Programs tab, Athletes tab, Revenue tab per the roadmap.
