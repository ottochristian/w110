# Load Test Data Generation Status

**Last Updated:** March 9, 2026 at 1:42 PM

## ✅ Completed

### Athlete Data
- **200,262 athletes** created across 32 clubs
- **80,012 households** 
- **Duration:** 5 hours 41 minutes
- **Status:** ✅ COMPLETE

### Programs & Sub-Programs
- **368 programs** created across 101 seasons
- **798 sub-programs** with pricing ($500-$2000)
- **Duration:** 2 minutes
- **Status:** ✅ COMPLETE

## 🔄 In Progress

### Revenue Data Generation
- **Process ID:** 9261
- **Started:** ~1:25 PM
- **Current Progress (as of 1:40 PM):**
  - 1,109 orders
  - 1,523 registrations
  - 524 payments
- **Expected Total:** ~50-70k orders, ~100-140k registrations
- **Estimated Completion:** Several hours (running in background)

### Log Files
- **Athlete Generation:** `load-test-simple.log`
- **Program Creation:** `create-programs.log`
- **Revenue Generation:** `revenue-final.log` (actively updating)

## Quick Status Checks

### Check Revenue Progress
```bash
cd ~/Documents/Coding_Shit/ski_admin
tail -30 revenue-final.log
```

### Database Stats
```sql
SELECT 
  'Athletes' as entity, COUNT(*) as count FROM athletes
UNION ALL SELECT 'Households', COUNT(*) FROM households
UNION ALL SELECT 'Programs', COUNT(*) FROM programs
UNION ALL SELECT 'Sub-Programs', COUNT(*) FROM sub_programs  
UNION ALL SELECT 'Registrations', COUNT(*) FROM registrations
UNION ALL SELECT 'Orders', COUNT(*) FROM orders
UNION ALL SELECT 'Payments', COUNT(*) FROM payments
ORDER BY entity;
```

### Check Process Status
```bash
ps -p 9261 -o pid,stat,etime,command
```

## Known Issues Fixed

During generation, we encountered and fixed several schema mismatches:
- ✅ Program status enum values (ACTIVE/INACTIVE)
- ✅ Sub-program columns (max_capacity vs max_participants)
- ✅ Registration fields (amount_paid vs price_cents)
- ✅ Order status values (unpaid/paid vs pending)
- ✅ Revenue tracking (dollars vs cents)
- ✅ Required season fields

## What's Running

The revenue generation script (`scripts/add-revenue-only.ts`) is:
1. Processing 32 clubs sequentially
2. For each club:
   - Fetching athletes without registrations
   - Creating orders per household (70% registration rate)
   - Adding registrations for each athlete
   - Creating payments for paid orders (85% payment rate)
3. Progress updates every 500 households

## Next Steps (When Complete)

1. Run data validation: `npm run validate:data`
2. Test UI performance with pagination
3. Check analytics/revenue metrics in dashboard
4. Verify batch waiver checks are working

## Expected Final Numbers

- **Athletes:** 200,262
- **Households:** 80,012
- **Programs:** 368
- **Sub-Programs:** 798
- **Registrations:** ~140,000 (70% of 200k athletes)
- **Orders:** ~56,000 (grouped by household)
- **Payments:** ~47,600 (85% paid)
- **Revenue:** $8-15M (estimated based on $800-1500 avg per athlete)
