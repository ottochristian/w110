# Load Test Data - Quick Reference

## Commands

### Generate Data

```bash
# Default: 100,000 athletes across 10 clubs
npm run generate:load-test

# Dry run (preview without executing)
npm run generate:load-test:dry

# Custom configuration
npx tsx scripts/generate-load-test-data.ts --clubs 5 --athletes 50000

# See all options
npx tsx scripts/generate-load-test-data.ts --help
```

### Validate Data

```bash
# Check data integrity
npm run validate:data

# Manual SQL validation
# Run in Supabase SQL Editor:
SELECT * FROM validate_data_integrity();
```

### View Statistics

```sql
-- Run in Supabase SQL Editor
SELECT * FROM get_data_statistics();
```

### Cleanup Data

```sql
-- Run in Supabase SQL Editor
-- Open: scripts/cleanup-load-test-data.sql
-- Uncomment the deletion section and run
```

## Common Configurations

### Small Test (10k athletes)
```bash
npx tsx scripts/generate-load-test-data.ts \
  --clubs 5 \
  --athletes 10000
```
- **Time**: 2-3 minutes
- **Size**: ~50 MB
- **Use**: Quick testing

### Recommended (100k athletes) ⭐
```bash
npm run generate:load-test
```
- **Time**: 20-30 minutes
- **Size**: ~500 MB
- **Use**: Performance testing

### Stress Test (500k athletes)
```bash
npx tsx scripts/generate-load-test-data.ts \
  --clubs 20 \
  --athletes 500000
```
- **Time**: 2-3 hours
- **Size**: ~2.5 GB
- **Use**: Extreme scale

## What Gets Created (100k Athletes)

| Entity | Count |
|--------|-------|
| Athletes | 100,000 |
| Households | ~50,000 |
| Parents | ~50,000 |
| Clubs | 10 |
| Coaches | 100 |
| Programs | 50 |
| Sub-Programs | 150 |
| Groups | 600 |
| Registrations | ~70,000 |
| Orders | ~56,000 |
| Payments | ~47,600 |
| Revenue | ~$5M |

## Files

| File | Purpose |
|------|---------|
| `scripts/generate-load-test-data.ts` | Main generation script |
| `scripts/validate-data-integrity.ts` | Validation script |
| `scripts/cleanup-load-test-data.sql` | Cleanup script |
| `LOAD_TEST_DATA_README.md` | Detailed documentation |
| `LOAD_TEST_SUMMARY.md` | Executive summary |
| `migrations/40_add_load_test_helpers.sql` | Database functions |

## Database Functions

```sql
-- Create parent with household atomically
SELECT * FROM create_parent_with_household(
  p_club_id := 'club-uuid',
  p_email := 'parent@example.com',
  p_first_name := 'John',
  p_last_name := 'Doe',
  p_athlete_count := 2
);

-- Validate data integrity
SELECT * FROM validate_data_integrity();

-- Get statistics
SELECT * FROM get_data_statistics();

-- Cleanup orphaned records
SELECT * FROM cleanup_orphaned_records();
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Missing env vars | Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` |
| Function not found | Run migration 40: Check database migrations |
| Out of memory | Reduce `--batch-size` or `--athletes` |
| Validation errors | Run `SELECT * FROM validate_data_integrity()` |
| Slow generation | Run during off-hours, check database plan |

## Data Integrity Checks

After generation, these checks run automatically:

- ✅ Each parent has exactly 1 household
- ✅ All athletes have valid households
- ✅ No duplicate athletes per club
- ✅ Club IDs match correctly
- ✅ All coaches have profiles
- ✅ All profiles have club_id
- ✅ Each club has one current season

## Support

- **Detailed docs**: `LOAD_TEST_DATA_README.md`
- **Summary**: `LOAD_TEST_SUMMARY.md`
- **Helper functions**: `migrations/40_add_load_test_helpers.sql`
- **Validation**: `npm run validate:data`

---

**Ready to generate?** Run: `npm run generate:load-test:dry`
