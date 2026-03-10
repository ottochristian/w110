# Performance Assessment Guide

## Overview

With 200k+ athletes, 80k households, and 368 programs, we can now properly test performance at scale.

## 1. Frontend Performance (Browser)

### Browser DevTools - Network Tab
**Chrome DevTools → Network Tab**

Key metrics to watch:
- **DOMContentLoaded:** Should be < 2s
- **Load Time:** Should be < 3s  
- **Largest Contentful Paint (LCP):** Should be < 2.5s
- **First Input Delay (FID):** Should be < 100ms
- **Cumulative Layout Shift (CLS):** Should be < 0.1

**How to test:**
```bash
# Start dev server
npm run dev

# Open Chrome DevTools (Cmd+Option+I)
# 1. Go to Network tab
# 2. Check "Disable cache"
# 3. Navigate to: http://localhost:3000/clubs/[clubSlug]/admin/athletes
# 4. Watch the waterfall and timing
```

### Performance Tab
**Chrome DevTools → Performance Tab**

1. Click Record (⚫)
2. Navigate to athletes page
3. Wait for page to load
4. Stop recording
5. Analyze:
   - **Scripting time** (should be < 500ms)
   - **Rendering time** (should be < 200ms)
   - **Main thread blocking** (avoid long tasks > 50ms)

### Lighthouse Audit
**Chrome DevTools → Lighthouse Tab**

```bash
# Run Lighthouse audit
1. Open DevTools → Lighthouse
2. Select "Performance" + "Desktop"
3. Click "Analyze page load"
4. Target scores:
   - Performance: > 90
   - Accessibility: > 95
   - Best Practices: > 90
```

### React DevTools Profiler
**React DevTools → Profiler Tab**

```bash
# Install React DevTools extension
# Then:
1. Open page
2. React DevTools → Profiler
3. Click Record (⚫)
4. Interact with page (pagination, search, filters)
5. Stop recording
6. Look for:
   - Components taking > 16ms to render
   - Unnecessary re-renders
   - Flamegraph patterns
```

## 2. Database Performance

### Query Performance Analysis

```sql
-- Enable query timing
\timing on

-- Test paginated athlete query (what your UI uses)
EXPLAIN ANALYZE
SELECT 
  a.*,
  h.id as household_id
FROM athletes a
LEFT JOIN households h ON h.id = a.household_id
WHERE a.club_id = 'YOUR_CLUB_ID'
ORDER BY a.created_at DESC
LIMIT 50 OFFSET 0;

-- Look for:
-- - Execution Time: Should be < 100ms
-- - Seq Scan (bad) vs Index Scan (good)
-- - Rows returned vs rows scanned
```

### Batch Waiver Check Performance

```sql
-- Test the batch waiver check we created
EXPLAIN ANALYZE
SELECT * FROM check_waivers_batch(
  ARRAY['athlete_id_1', 'athlete_id_2'], -- Replace with real IDs
  'season_id' -- Replace with real season ID
);

-- Should complete in < 50ms for 50 athletes
```

### Index Health Check

```sql
-- Check if indexes exist on key columns
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('athletes', 'registrations', 'orders', 'households')
ORDER BY tablename, indexname;

-- Key indexes to verify:
-- athletes: club_id, household_id
-- registrations: athlete_id, sub_program_id, season_id
-- orders: household_id, club_id
-- households: club_id
```

### Slow Query Log

```sql
-- Find slow queries (if pg_stat_statements is enabled)
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%athletes%'
  OR query LIKE '%registrations%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 3. API Performance Testing

### Simple Timing Tests

Create `scripts/test-api-performance.ts`:
```typescript
const testEndpoints = async () => {
  const endpoints = [
    '/api/athletes',
    '/api/registrations', 
    '/api/orders',
  ];

  for (const endpoint of endpoints) {
    const start = performance.now();
    const response = await fetch(`http://localhost:3000${endpoint}`);
    const end = performance.now();
    
    console.log(`${endpoint}: ${(end - start).toFixed(0)}ms`);
  }
};
```

### Load Testing with Artillery

```bash
# Install Artillery
npm install -g artillery

# Create artillery.yml
cat > artillery.yml << 'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
scenarios:
  - name: "Browse athletes"
    flow:
      - get:
          url: "/clubs/{{ $randomString() }}/admin/athletes?page=1"
      - think: 2
      - get:
          url: "/clubs/{{ $randomString() }}/admin/athletes?page=2"
EOF

# Run load test
artillery run artillery.yml
```

### cURL Timing

```bash
# Test API endpoint response time
curl -w "\n\nTime Total: %{time_total}s\nTime Connect: %{time_connect}s\nTime Start Transfer: %{time_starttransfer}s\n" \
  -H "Cookie: your-auth-cookie" \
  "http://localhost:3000/api/athletes?clubId=YOUR_CLUB_ID"

# Good targets:
# Time Total: < 0.5s
# Time Start Transfer: < 0.3s
```

## 4. Next.js Specific Metrics

### Build Analysis

```bash
# Analyze bundle size
npm run build

# Look for:
# - Page sizes < 200KB (First Load JS)
# - Shared bundle size
# - Individual route sizes
```

### Server-Side Timing

Add to your API routes:
```typescript
export async function GET(request: Request) {
  const start = Date.now();
  
  // Your logic here
  const data = await fetchData();
  
  const duration = Date.now() - start;
  console.log(`API took ${duration}ms`);
  
  return Response.json(data, {
    headers: {
      'Server-Timing': `db;dur=${duration}`
    }
  });
}
```

## 5. Real User Monitoring (RUM)

### Manual Timing in Browser

Open Console and run:
```javascript
// Check current page performance
performance.getEntriesByType('navigation').forEach(entry => {
  console.log('DNS:', entry.domainLookupEnd - entry.domainLookupStart);
  console.log('TCP:', entry.connectEnd - entry.connectStart);
  console.log('Request:', entry.responseStart - entry.requestStart);
  console.log('Response:', entry.responseEnd - entry.responseStart);
  console.log('DOM Processing:', entry.domContentLoadedEventEnd - entry.responseEnd);
  console.log('Total:', entry.loadEventEnd - entry.fetchStart);
});

// Check all resources
performance.getEntriesByType('resource').forEach(r => {
  if (r.duration > 500) {
    console.log(`Slow resource: ${r.name} took ${r.duration}ms`);
  }
});
```

## 6. Pagination Performance Test

### Test Script

Create `scripts/test-pagination-performance.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testPagination() {
  const clubId = 'YOUR_CLUB_ID';
  const pageSize = 50;
  
  console.log('Testing pagination performance...\n');
  
  for (let page = 1; page <= 10; page++) {
    const start = Date.now();
    
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    const duration = Date.now() - start;
    
    console.log(`Page ${page}: ${duration}ms (${data?.length || 0} records)`);
    
    if (duration > 500) {
      console.warn(`⚠️  Page ${page} is slow!`);
    }
  }
}

testPagination();
```

Run:
```bash
npx tsx scripts/test-pagination-performance.ts
```

## 7. Memory & Resource Usage

### Browser Memory

```javascript
// In browser console
console.log(`Memory: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`);

// Monitor over time
setInterval(() => {
  console.log(`Memory: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`);
}, 5000);
```

### Node.js Memory (API)

Add to API routes:
```typescript
const used = process.memoryUsage();
console.log({
  rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
  heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
});
```

## 8. Performance Benchmarks to Hit

### Page Load Times (with 200k athletes)
- **Athletes list page (paginated):** < 1s
- **Individual athlete page:** < 800ms
- **Dashboard/analytics:** < 2s
- **Search results:** < 1.5s

### Database Queries
- **Simple SELECT with pagination:** < 100ms
- **Batch waiver check (50 athletes):** < 50ms
- **Complex joins (with aggregations):** < 300ms
- **Search queries:** < 200ms

### API Endpoints
- **GET requests:** < 500ms
- **POST/PUT requests:** < 800ms
- **Complex aggregations:** < 1.5s

### UI Interactions
- **Pagination click:** < 300ms
- **Search typing (debounced):** < 500ms
- **Filter selection:** < 400ms
- **Modal open:** < 100ms

## 9. Quick Performance Test Checklist

```bash
# 1. Start dev server
npm run dev

# 2. Open Chrome DevTools
# 3. Test these pages with Network tab open:
- [ ] Athletes list (first page)
- [ ] Athletes list (page 10)
- [ ] Search for athlete
- [ ] Dashboard/analytics
- [ ] Registration list
- [ ] Order history

# 4. Record metrics:
- [ ] Page load time
- [ ] Time to Interactive (TTI)
- [ ] Number of requests
- [ ] Total data transferred
- [ ] Largest resource

# 5. Run Lighthouse audit
- [ ] Performance score > 90
- [ ] Identify optimization opportunities
```

## 10. Common Performance Issues & Fixes

### Issue: Slow page load
**Check:**
- N+1 queries → Use batching
- Large payload → Add pagination
- Missing indexes → Add to frequently queried columns
- Unoptimized images → Add next/image optimization

### Issue: High memory usage
**Check:**
- Memory leaks → Check for unmounted component subscriptions
- Large state objects → Paginate/virtualize data
- Retained references → Clear event listeners on unmount

### Issue: Slow database queries
**Check:**
- Missing indexes → Add appropriate indexes
- Full table scans → Add WHERE clauses
- Complex joins → Denormalize or use materialized views
- Large result sets → Add LIMIT

## Tools Summary

1. **Chrome DevTools** - Frontend performance, network, memory
2. **React DevTools** - Component rendering performance
3. **Lighthouse** - Overall page performance score
4. **Supabase Dashboard** - Query logs and performance
5. **Artillery/k6** - Load testing
6. **pg_stat_statements** - Database query analysis

## Next Steps

1. ✅ Run initial benchmarks (record baseline numbers)
2. Test with your new 200k athlete dataset
3. Identify bottlenecks
4. Optimize (indexes, pagination, caching)
5. Re-test and compare improvements
6. Set up continuous monitoring

Would you like me to create automated performance test scripts for your specific pages?
