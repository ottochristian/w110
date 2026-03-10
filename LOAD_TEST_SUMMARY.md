# Load Test Data Generation - Executive Summary

## Your Questions Answered

### ✅ Is 100,000 athletes feasible?
**Yes, absolutely!** Your app already has the infrastructure to support this:
- Database helper functions for atomic data creation
- Validation functions to ensure data integrity
- Supabase can easily handle 100k+ records

### ✅ Is 100,000 enough?
**Yes, for most purposes.** Here's why:

**100,000 athletes is perfect for:**
- UI performance testing (pagination, search, filtering)
- API load testing
- Database query optimization
- Report generation
- Real-world usage simulation (covers 10-20 years of growth for most clubs)

**Consider MORE (500k-1M) only if:**
- Testing extreme edge cases
- Planning for massive scale (100+ clubs)
- Database performance tuning at scale

**Consider LESS (10k-50k) if:**
- Quick smoke testing
- Feature development (not performance testing)
- Limited database resources

### 💡 Recommendation: Start with 100k

**Why 100k is the sweet spot:**
- ✅ Large enough to reveal real performance issues
- ✅ Small enough to generate in ~20-30 minutes
- ✅ Realistic for ski club management (most clubs have 500-2,000 athletes)
- ✅ Tests pagination, search, filtering effectively
- ✅ Provides meaningful revenue data for reports

## What You'll Get

### For 100,000 Athletes Across 10 Clubs:

```
📊 Data Generated:
┌─────────────────────┬──────────────┐
│ Metric              │ Count        │
├─────────────────────┼──────────────┤
│ Total Athletes      │ 100,000      │
│ Households          │ ~50,000      │
│ Parents             │ ~50,000      │
│ Clubs               │ 10           │
│ Coaches             │ 100          │
│ Programs            │ 50           │
│ Sub-Programs        │ 150          │
│ Groups              │ 600          │
│ Registrations       │ ~70,000      │
│ Orders              │ ~56,000      │
│ Paid Orders         │ ~47,600      │
│ Estimated Revenue   │ ~$5,000,000  │
└─────────────────────┴──────────────┘

⏱️  Generation Time: 20-30 minutes
💾  Database Size:   ~500 MB
```

### Revenue Data Included
- ✅ Realistic order patterns (grouped by household)
- ✅ Mix of paid and pending orders (85% paid)
- ✅ Varied registration prices ($500-$2,000)
- ✅ Multiple registrations per household
- ✅ Payment records with Stripe payment intent IDs

### Data Quality
- ✅ Faker.js for realistic fake data
- ✅ Proper relationships (no orphaned records)
- ✅ Atomic creation (prevents data integrity issues)
- ✅ Automatic validation after generation
- ✅ Club-aware data (no cross-club contamination)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Preview the Plan (Dry Run)
```bash
npm run generate:load-test:dry
```

### 3. Generate the Data
```bash
npm run generate:load-test
```

Or with custom configuration:
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 10 --athletes 100000
```

### 4. Monitor Progress
Watch the terminal for real-time updates:
- Club creation
- Season, admin, coach creation
- Household generation (with progress %)
- Registration and order creation
- Data validation results
- Final statistics

## Scaling Guide

### Conservative (10k athletes)
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 5 --athletes 10000
```
- **Time**: ~2-3 minutes
- **Use for**: Quick testing, feature development
- **Database**: ~50 MB

### Recommended (100k athletes) ⭐
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 10 --athletes 100000
```
- **Time**: ~20-30 minutes
- **Use for**: Performance testing, load testing, UI testing
- **Database**: ~500 MB

### Stress Testing (500k athletes)
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 20 --athletes 500000
```
- **Time**: ~2-3 hours
- **Use for**: Extreme scale testing, database optimization
- **Database**: ~2.5 GB

### Extreme (1M+ athletes)
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 50 --athletes 1000000
```
- **Time**: ~6-12 hours
- **Use for**: Only if planning for massive scale
- **Database**: ~5 GB
- **Note**: May require Supabase Pro plan

## Safety Features

### Built-in Validation
After generation, the script automatically checks:
- ✅ Each parent has exactly 1 household
- ✅ All athletes have valid households
- ✅ No duplicate athletes per club
- ✅ Club IDs match correctly
- ✅ All relationships are valid

### Atomic Operations
Uses database function `create_parent_with_household()` to ensure:
- Parent, household, and athletes created together
- No partial data if errors occur
- Prevents common data integrity issues

### Easy Cleanup
```bash
# Open Supabase SQL Editor and run:
scripts/cleanup-load-test-data.sql
```

## Performance Tips

### 1. Start Small, Scale Up
```bash
# Start with 10k to verify everything works
npx tsx scripts/generate-load-test-data.ts --clubs 2 --athletes 10000

# Then scale to 100k
npx tsx scripts/generate-load-test-data.ts --clubs 10 --athletes 100000
```

### 2. Run During Off-Hours
Large data generation can impact database performance:
- Run overnight
- During low-traffic periods
- Consider maintenance windows

### 3. Monitor Database
Check Supabase Dashboard:
- Database size
- Connection limits
- Query performance
- Storage usage

### 4. Backup First
Always create a backup before generating large datasets:
1. Go to Supabase Dashboard > Settings > Database > Backups
2. Create manual backup
3. Wait for backup to complete
4. Run data generation

## What to Test After Generation

### UI Performance
- [ ] Load athlete lists (with 10k+ records)
- [ ] Test search and filtering
- [ ] Pagination behavior
- [ ] Dashboard widgets with aggregated data
- [ ] Report generation UI

### API Endpoints
- [ ] GET /api/athletes (with pagination)
- [ ] GET /api/registrations (with filters)
- [ ] POST /api/checkout (with multiple items)
- [ ] GET /api/orders (with date ranges)
- [ ] Export endpoints (CSV, PDF)

### Database Queries
- [ ] Run EXPLAIN ANALYZE on slow queries
- [ ] Check index usage
- [ ] Optimize N+1 queries
- [ ] Test aggregation performance

### Reports & Analytics
- [ ] Revenue reports by date range
- [ ] Athlete registration trends
- [ ] Program popularity reports
- [ ] Coach assignments
- [ ] Household summaries

## Troubleshooting

### "Out of memory"
**Solution**: Reduce batch size
```bash
npx tsx scripts/generate-load-test-data.ts --batch-size 250
```

### "Function does not exist"
**Solution**: Ensure migration 40 is applied
```bash
# Check if function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'create_parent_with_household';
```

### Validation Errors
**Solution**: Check specific issues
```sql
SELECT * FROM validate_data_integrity() WHERE issue_count > 0;
```

## Files Created

```
scripts/
  ├── generate-load-test-data.ts     # Main generation script
  └── cleanup-load-test-data.sql     # Cleanup script

docs/
  ├── LOAD_TEST_DATA_README.md       # Detailed documentation
  └── LOAD_TEST_SUMMARY.md           # This file (executive summary)
```

## Next Steps

1. **Install dependencies**: `npm install`
2. **Preview the plan**: `npm run generate:load-test:dry`
3. **Generate data**: `npm run generate:load-test`
4. **Test your app**: Focus on performance bottlenecks
5. **Monitor**: Check query performance and response times
6. **Optimize**: Add indexes, optimize queries as needed
7. **Cleanup**: When done, use cleanup script

## Support

- 📚 Detailed docs: `LOAD_TEST_DATA_README.md`
- 🔧 Helper functions: migration `40_add_load_test_helpers.sql`
- 🗑️ Cleanup: `scripts/cleanup-load-test-data.sql`
- ✅ Validation: `SELECT * FROM validate_data_integrity();`
- 📊 Statistics: `SELECT * FROM get_data_statistics();`

---

**Ready to generate 100,000 test athletes?** 🎿

```bash
npm run generate:load-test
```
