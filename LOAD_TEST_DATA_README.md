# Load Test Data Generation Guide

## Overview

This guide helps you generate large-scale test data for load testing your ski admin application. The script creates realistic data including clubs, users, households, athletes, programs, and revenue data (orders/payments).

## Quick Start

```bash
# Generate 100,000 athletes across 10 clubs (default)
npm run generate:load-test

# Custom configuration
npx tsx scripts/generate-load-test-data.ts --clubs 5 --athletes 50000

# Dry run to see the plan without executing
npx tsx scripts/generate-load-test-data.ts --clubs 10 --athletes 100000 --dry-run
```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `--clubs <number>` | Number of clubs to create | 10 |
| `--athletes <number>` | Total number of athletes across all clubs | 100,000 |
| `--batch-size <number>` | Batch size for database inserts | 500 |
| `--dry-run` | Show execution plan without creating data | false |
| `--help` | Display help message | - |

## What Gets Created

### Per Club:
- **1 Active Season**: Current 2024-2025 season
- **2 Admins**: Club administrators
- **10 Coaches**: With profiles and specialties
- **5 Programs**: Alpine, Nordic, Freestyle, etc.
- **15 Sub-Programs**: 3 levels per program (Beginner, Intermediate, Advanced)
- **60 Groups**: 4 groups per sub-program
- **~10,000 Athletes**: Distributed across households
- **~5,000 Households**: 1-4 athletes per household on average
- **~7,000 Registrations**: 70% of athletes register
- **~6,000 Orders**: Grouped by household
- **~5,000 Payments**: 85% of orders are paid

### Example for 100k Athletes Across 10 Clubs:

```
📊 Estimated Totals:
  Total Households:      50,000
  Total Parents:         50,000
  Total Admins:          20
  Total Coaches:         100
  Total Programs:        50
  Total Sub-Programs:    150
  Total Groups:          600
  Total Registrations:   70,000
  Total Orders:          56,000
  Total Payments:        47,600
  Estimated Revenue:     ~$5,000,000
```

## Prerequisites

1. **Environment Variables**: Ensure `.env.local` has:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database Functions**: The helper functions must exist (created by migration 40):
   - `create_parent_with_household()`
   - `validate_data_integrity()`
   - `get_data_statistics()`

3. **Dependencies**: Install required packages:
   ```bash
   npm install @faker-js/faker tsx
   ```

## How It Works

### 1. Atomic Data Creation
The script uses the `create_parent_with_household()` database function to ensure data integrity:
- Creates parent profile
- Creates household
- Links parent to household (via `household_guardians`)
- Creates athletes for the household

This prevents common issues like:
- Multiple households per parent
- Orphaned athletes
- Missing household links

### 2. Realistic Fake Data
Uses `@faker-js/faker` to generate:
- Realistic names, emails, locations
- Varied athlete ages (children and teens)
- Different program preferences
- Realistic registration patterns

### 3. Revenue Data
Creates realistic revenue scenarios:
- 70% registration rate (configurable)
- 85% payment rate (configurable)
- Orders grouped by household (realistic checkout behavior)
- Random sub-program selections
- Prices ranging from $500-$2,000 per registration

### 4. Performance Optimizations
- Batch inserts (100 records at a time)
- Parallel processing where possible
- Progress indicators for long operations
- Uses database functions for complex operations

## Execution Flow

```
1. Parse command-line arguments
2. Calculate and display execution plan
3. Create clubs (with names, slugs, emails)
   └─ For each club:
      ├─ Create active season
      ├─ Create admins
      ├─ Create coaches (profiles + coach records)
      ├─ Create programs
      │  └─ For each program:
      │     ├─ Create sub-programs
      │     │  └─ For each sub-program:
      │     │     └─ Create groups
      ├─ Create households with parents and athletes (batched)
      └─ Create registrations, orders, and payments
4. Validate data integrity
5. Display final statistics
```

## Data Validation

After generation, the script automatically validates:

### Critical Checks
- ✅ Each parent has exactly 1 household
- ✅ All athletes belong to valid households
- ✅ No duplicate athletes within a club
- ✅ Athlete club_id matches household club_id
- ✅ All coaches have valid profiles
- ✅ All profiles have a club_id

### High-Priority Checks
- ✅ Each club has one current season
- ✅ No clubs have multiple current seasons

If any issues are found, they will be displayed with severity levels.

## Performance Expectations

Based on testing with Supabase:

| Athletes | Clubs | Est. Time | Database Size |
|----------|-------|-----------|---------------|
| 10,000   | 5     | ~2-3 min  | ~50 MB        |
| 50,000   | 10    | ~10-15 min | ~250 MB      |
| 100,000  | 10    | ~20-30 min | ~500 MB      |
| 500,000  | 20    | ~2-3 hours | ~2.5 GB      |

*Times vary based on network speed and Supabase plan*

## Is 100,000 Athletes Enough?

**Short answer: Yes, for most scenarios.**

### 100k Athletes is Good For:
- ✅ UI performance testing (pagination, filtering, search)
- ✅ API endpoint load testing
- ✅ Database query optimization
- ✅ Report generation performance
- ✅ Export/import operations
- ✅ Realistic club management scenarios

### Consider More (500k-1M) If:
- 🎯 Testing extreme edge cases
- 🎯 Multi-tenant performance at scale
- 🎯 Database indexing strategies
- 🎯 Caching effectiveness
- 🎯 Planning for 10+ years of growth

### Consider Less (10k-50k) If:
- 🎯 Just testing basic functionality
- 🎯 Development environment has limited resources
- 🎯 Focusing on feature development, not performance
- 🎯 Quick smoke tests

## Scaling Recommendations

### For 100k Athletes (Recommended Starting Point)
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 10 --athletes 100000
```
- Good balance of realism and generation time
- Covers most performance bottlenecks
- Enough data to test pagination, filtering, aggregations

### For 500k Athletes (Stress Testing)
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 20 --athletes 500000
```
- Tests system under heavy load
- Reveals scalability issues
- Takes 2-3 hours to generate
- Requires ~2.5GB database space

### For 1M+ Athletes (Extreme Scale)
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 50 --athletes 1000000
```
- Only if testing for massive scale
- May take 6-12 hours to generate
- Requires significant database resources
- Consider Supabase Pro plan

## Cleaning Up Test Data

### Delete All Load Test Data
```sql
-- Delete in dependency order
DELETE FROM payments WHERE order_id IN (
  SELECT id FROM orders WHERE club_id IN (
    SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
  )
);

DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE club_id IN (
    SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
  )
);

DELETE FROM orders WHERE club_id IN (
  SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
);

DELETE FROM registrations WHERE athlete_id IN (
  SELECT id FROM athletes WHERE club_id IN (
    SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
  )
);

DELETE FROM athletes WHERE club_id IN (
  SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
);

DELETE FROM household_guardians WHERE household_id IN (
  SELECT id FROM households WHERE club_id IN (
    SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
  )
);

DELETE FROM households WHERE club_id IN (
  SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
);

DELETE FROM coaches WHERE club_id IN (
  SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
);

DELETE FROM profiles WHERE email LIKE 'loadtest-%@example.com';

DELETE FROM groups WHERE sub_program_id IN (
  SELECT id FROM sub_programs WHERE program_id IN (
    SELECT id FROM programs WHERE club_id IN (
      SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
    )
  )
);

DELETE FROM sub_programs WHERE program_id IN (
  SELECT id FROM programs WHERE club_id IN (
    SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
  )
);

DELETE FROM programs WHERE club_id IN (
  SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
);

DELETE FROM seasons WHERE club_id IN (
  SELECT id FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9'
);

DELETE FROM clubs WHERE slug LIKE '%-0' OR slug LIKE '%-1' OR slug LIKE '%-9';
```

### Or Use the Cleanup Function
```sql
SELECT cleanup_orphaned_records();
```

## Monitoring During Generation

The script provides real-time progress:
- Club creation progress
- Household creation percentage
- Registration/order counts
- Data integrity validation results
- Final statistics by category

Example output:
```
🏢 Processing Club 3/10: Denver Ski Club
══════════════════════════════════════════════════
  📅 Creating seasons for Denver Ski Club...
  👤 Creating 2 admins for Denver Ski Club...
  👨‍🏫 Creating 10 coaches for Denver Ski Club...
  🏂 Creating 5 programs for Denver Ski Club...
  👨‍👩‍👧‍👦 Creating 5000 households with athletes for Denver Ski Club...
    Progress: 20.0% (1000/5000)
    Progress: 40.0% (2000/5000)
    ...
  💰 Creating registrations and orders for Denver Ski Club...
    Created 100 orders, 140 registrations...
    Created 200 orders, 280 registrations...
    ...
```

## Troubleshooting

### Error: "Missing environment variables"
**Solution**: Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Function create_parent_with_household does not exist"
**Solution**: Run migration 40 first:
```bash
# Apply migration
npm run db:migrate
```

### Error: "Out of memory"
**Solution**: Reduce batch size or athlete count:
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 5 --athletes 50000 --batch-size 250
```

### Error: "Too many database connections"
**Solution**: 
- Check Supabase plan limits
- Reduce number of concurrent operations
- Use a higher-tier Supabase plan

### Validation Shows Issues
**Solution**: Review the specific check that failed and run:
```sql
SELECT * FROM validate_data_integrity() WHERE issue_count > 0;
```
Then fix issues manually or re-run with `cleanup_orphaned_records()`.

## Best Practices

### 1. Start Small
Test with 10k athletes first to verify everything works:
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 2 --athletes 10000
```

### 2. Use Dry Run
Always preview the execution plan:
```bash
npx tsx scripts/generate-load-test-data.ts --clubs 10 --athletes 100000 --dry-run
```

### 3. Monitor Database Size
Check your Supabase dashboard for:
- Database size
- Connection limits
- Query performance

### 4. Run During Off-Hours
Large data generation can impact database performance:
- Run overnight or during low-traffic periods
- Consider temporary read replicas for production testing

### 5. Backup First
Always backup before generating large amounts of data:
```bash
# Supabase Dashboard > Settings > Database > Backups
# Create manual backup
```

## Next Steps After Generation

1. **Test UI Performance**
   - Load athlete lists with 10k+ records
   - Test search and filtering
   - Check pagination behavior

2. **Test API Endpoints**
   - Load test registration endpoints
   - Test report generation
   - Verify query optimization

3. **Test Database Queries**
   - Run EXPLAIN ANALYZE on slow queries
   - Add indexes where needed
   - Optimize N+1 queries

4. **Test Export Operations**
   - Export large datasets
   - Generate PDF reports
   - CSV exports

5. **Monitor Application**
   - Check response times
   - Monitor database connection pool
   - Review error rates

## Support

If you encounter issues:
1. Check validation results: `SELECT * FROM validate_data_integrity();`
2. Review statistics: `SELECT * FROM get_data_statistics();`
3. Check logs in terminal output
4. Verify database functions exist

Happy load testing! 🚀
