# Manual Testing Guide for Analytics Dashboard

## ✅ Testing Checklist

Since I can't log in without credentials, here's how **YOU** can test the analytics dashboard I just built:

---

## 🧪 Test 1: Page Loads Without Errors

### Steps:
1. Make sure dev server is running (`npm run dev`)
2. Log in as an admin user
3. Navigate to: `http://localhost:3000/clubs/{your-club-slug}/admin/analytics`
   - Replace `{your-club-slug}` with your actual club slug (e.g., `gtssf`, `jackson`)
4. Click the new **"Analytics"** link in the left sidebar

### Expected:
- ✅ Page loads without errors
- ✅ You see a filter bar at the top
- ✅ You see 4 metric cards (Revenue, Registrations, Athletes, Outstanding)
- ✅ You see charts below the metrics
- ✅ No error messages in browser console (F12 → Console tab)

### If It Fails:
- Check browser console for errors
- Check Network tab for failed API calls
- Verify you're logged in as an admin
- Verify your club has a current season

---

## 🧪 Test 2: Hero Metrics Show Real Data

### What to Check:
Look at the 4 big number cards:

1. **Total Revenue**
   - Should show a dollar amount (not $0 if you have paid registrations)
   - Should show "Net: $X" underneath
   - If you select a comparison season, should show ↑ or ↓ arrow

2. **Active Registrations**
   - Should show total count
   - Should show "X confirmed, Y pending" underneath
   - If you have a comparison season, should show trend

3. **Active Athletes**
   - Should show total athlete count
   - Should show "X households" underneath

4. **Outstanding Payments**
   - Should show amount owed
   - Should show "X households" underneath

### If Numbers Are All Zero:
- This means no registrations exist for the current season
- Try changing season selector (in sidebar) to a season with data
- Or create test registrations

---

## 🧪 Test 3: Charts Render Correctly

### What to Check:

1. **Registrations by Program (horizontal bars)**
   - Should show your actual program names on left
   - Bars should be different colors
   - Hover over bars → should show tooltip

2. **Registration Status (pie chart)**
   - Should show Confirmed, Pending, Waitlisted slices
   - Should show percentages
   - Should have legend below

3. **Revenue by Program (horizontal bars)**
   - Should show dollar amounts
   - Bars should be different colors
   - Should match programs from first chart

4. **Program Performance (metrics card)**
   - Should show total program count
   - Should show average per program
   - Should show most popular program name

### If Charts Are Empty:
- Check that registrations exist
- Check that sub_programs are linked to programs correctly
- Open DevTools → Network → look for API calls to `/api/admin/registrations/`

---

## 🧪 Test 4: Comparison Feature

### Steps:
1. Click the "Compare to" dropdown in the filter bar
2. Select a previous season (if available)
3. Watch the hero metric cards

### Expected:
- ✅ Green ↑ arrows appear (if current season is better)
- ✅ Red ↓ arrows appear (if current season is worse)
- ✅ Shows percentage difference
- ✅ Shows "vs last season" label

### If No Seasons Appear:
- You need at least 2 seasons in your database
- Go to Admin → Settings → Seasons
- Check if multiple seasons exist

---

## 🧪 Test 5: Quick Insights Panel

### What to Check:

Scroll down to the "Quick Insights" panel at the bottom.

### Expected Alerts:

**If you have pending registrations:**
- ⚠️ Yellow alert: "32 pending registrations - Review and approve"

**If you have waitlisted athletes:**
- ℹ️ Blue alert: "10 athletes on waitlist - Consider expanding capacity"

**If you have outstanding payments:**
- 💰 Red alert: "$8,450 outstanding - 23 households need payment follow-up"

**If everything is clean:**
- ✓ Green alert: "All systems running smoothly"

### If Panel Is Empty:
- This shouldn't happen - at least one message should show
- Check browser console for errors

---

## 🧪 Test 6: Interactivity

### What to Test:

1. **Advanced Filters Button:**
   - Click "Show Advanced Filters"
   - Should expand to show Program/Status/Payment/Gender dropdowns
   - Click "Hide Advanced Filters" → should collapse

2. **Export Button:**
   - Click "Export Overview" button
   - Check console → should see "Exporting overview data..."
   - (CSV export not yet implemented - this is expected)

3. **Reset Button:**
   - Select a comparison season
   - "Reset" button should appear
   - Click it → comparison should clear

---

## 🧪 Test 7: Responsive Design

### Steps:
1. Open browser DevTools (F12)
2. Click the device toolbar icon (mobile view)
3. Try different screen sizes

### Expected:
- ✅ Metric cards stack vertically on mobile
- ✅ Charts resize appropriately
- ✅ Filter bar remains usable
- ✅ No horizontal scrolling

---

## 🧪 Test 8: Performance

### What to Check:

1. **Page Load Speed:**
   - Should load in < 2 seconds
   - Metrics should appear first (with loading skeletons)
   - Charts should load shortly after

2. **Network Requests:**
   - Open DevTools → Network tab
   - Look for API calls:
     - `/api/admin/registrations/summary?seasonId=...`
     - `/api/admin/registrations/by-sport?seasonId=...`
   - Both should return 200 OK
   - Both should return in < 1 second

### If Slow:
- Check if you have thousands of registrations (pagination needed)
- Check Network tab for slow queries
- Check that database indexes exist

---

## 🧪 Test 9: Error Handling

### Scenarios to Test:

1. **No season selected:**
   - Temporarily set season to archived
   - Analytics should show loading or error state

2. **API failure:**
   - Disconnect network → reload page
   - Should show error state, not crash

3. **Empty data:**
   - If no registrations exist
   - Should show "No data available" not crash

---

## 📝 Report Card Template

After testing, fill this out:

```
✅ or ❌ - Page loads without errors
✅ or ❌ - Hero metrics show real numbers
✅ or ❌ - Charts render with colors
✅ or ❌ - Comparison feature works
✅ or ❌ - Quick insights show alerts
✅ or ❌ - Advanced filters toggle
✅ or ❌ - Responsive on mobile
✅ or ❌ - Performance < 2s load
✅ or ❌ - No console errors

Issues found:
- (list any bugs or issues)
```

---

## 🐛 Common Issues & Fixes

### Issue: "No linter errors" but page crashes
**Fix:** 
- Open browser console (F12)
- Look for runtime errors
- Check that all imports exist
- Verify Recharts is installed: `npm install recharts`

### Issue: Charts are gray/unstyled
**Fix:**
- Check that Tailwind CSS is compiling
- Verify `globals.css` is imported
- Check browser console for CSS errors

### Issue: Data doesn't load
**Fix:**
- Check Network tab → verify API calls succeed
- Verify you're logged in as admin
- Check that profile has a club_id
- Verify season is selected

### Issue: Comparison dropdown is empty
**Fix:**
- You need at least 2 seasons in your database
- Go to Admin → Settings → Seasons
- Create a previous season for comparison

---

## ✅ If All Tests Pass

**Congratulations!** Your analytics dashboard is working. 

**Next steps:**
1. Create demo data (realistic registrations across programs)
2. Practice your demo script
3. Show it to a club admin

**Next features to build:**
- Waivers tab
- Programs tab  
- Athletes tab
- CSV export functionality

---

## 📸 Take Screenshots

When testing, take screenshots of:
1. Overview page with data
2. Charts showing colors
3. Quick insights panel
4. Comparison season feature

Share these with me if you see any issues!

---

## 🆘 If Something Breaks

1. **Check browser console** (most important)
2. **Check Network tab** (API errors)
3. **Check terminal** (compilation errors)
4. Share the error message with me and I'll fix it!

---

**Ready to test?** Open your browser and navigate to the analytics page! 🚀
