# Performance Optimization Roadmap

## Current State: ✅ Good (183ms avg)
**Target:** < 100ms avg for excellent UX

## Phase 1: Database Optimizations (Done ✅)
- [x] Add composite indexes on frequently queried columns
- [x] Add text search indexes (pg_trgm)
- [x] Add foreign key indexes
- [x] Run ANALYZE to update query planner stats

**Result:** 203ms → 183ms (10% improvement)

## Phase 2: Query Optimizations (Next)

### 1. Reduce JOIN complexity
**Current issue:** Athletes query joins household on every request
```typescript
// Instead of:
.select('*, household:households(id)')

// Consider:
.select('*, household_id')
// Fetch household separately only when needed
```

### 2. Add query result caching
```typescript
// Add React Query or SWR for client-side caching
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['athletes', clubId, page],
  queryFn: () => fetchAthletes(clubId, page),
  staleTime: 1000 * 60 * 5, // 5 minutes
});
```

### 3. Optimize COUNT queries
```sql
-- Instead of COUNT(*) which scans all rows:
SELECT reltuples::bigint as count
FROM pg_class
WHERE relname = 'athletes';
-- Approximate count (much faster)
```

### 4. Add database-level caching
```sql
-- Create materialized view for athlete counts per club
CREATE MATERIALIZED VIEW athlete_counts_by_club AS
SELECT 
  club_id,
  COUNT(*) as total_athletes,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_athletes
FROM athletes
GROUP BY club_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY athlete_counts_by_club;
```

## Phase 3: Frontend Optimizations

### 1. Implement Virtual Scrolling
For very long lists, render only visible items:
```bash
npm install react-virtual
```

### 2. Optimize Re-renders
- Use React.memo for list items
- Implement proper keys
- Avoid inline function creation

### 3. Code Splitting
```typescript
// Lazy load heavy components
const AthletesTable = lazy(() => import('./AthletesTable'));
```

### 4. Image Optimization
```typescript
// Use Next.js Image component
import Image from 'next/image';
```

## Phase 4: API Response Optimization

### 1. Implement API Response Caching
```typescript
// Add cache headers
return Response.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
  }
});
```

### 2. Add Compression
```typescript
// Compress large JSON responses
import { gzip } from 'zlib';
```

### 3. Implement GraphQL (Advanced)
Consider if REST is too chatty:
```bash
npm install @apollo/client graphql
```

## Phase 5: Infrastructure Improvements

### 1. Add Redis Caching Layer
```bash
# Cache frequently accessed data
redis.set(`athletes:${clubId}:page:1`, data, 'EX', 300);
```

### 2. Connection Pooling
```typescript
// Configure Supabase connection pooler
const supabase = createClient(url, key, {
  db: {
    poolerMode: 'transaction',
  }
});
```

### 3. Read Replicas
For read-heavy workloads, route reads to replicas

### 4. CDN for Static Assets
Move static files to CDN for faster delivery

## Quick Wins (Do These Next)

1. **Remove unnecessary joins from pagination query**
   - Impact: 20-30% faster
   - Effort: Low
   - Time: 15 minutes

2. **Add React Query for client-side caching**
   - Impact: Instant subsequent page loads
   - Effort: Medium
   - Time: 1 hour

3. **Implement approximate counts**
   - Impact: Count queries < 10ms
   - Effort: Low
   - Time: 30 minutes

4. **Add cache headers to API routes**
   - Impact: Reduced server load
   - Effort: Low
   - Time: 30 minutes

## Monitoring & Measuring

### Set up continuous monitoring:
```typescript
// Add to all API routes
console.time('query');
const data = await fetchData();
console.timeEnd('query');
```

### Create performance dashboard:
- Track P50, P95, P99 response times
- Monitor database connection pool
- Watch for slow query alerts
- Track error rates

## Expected Results After All Phases

| Metric | Current | Target | Phase |
|--------|---------|--------|-------|
| First page load | 196ms | < 50ms | Phase 2 + 3 |
| Subsequent loads | 196ms | < 10ms | Phase 3 (cache) |
| Search queries | 144ms | < 80ms | Phase 2 |
| Count queries | 102ms | < 10ms | Phase 2 |
| Complex joins | 183ms | < 100ms | Phase 2 + 4 |

## Success Metrics

- ✅ P95 response time < 200ms
- ✅ Average query time < 100ms
- ✅ Page load < 1s
- ✅ Time to Interactive < 2s
- ✅ Lighthouse score > 95

---

## Current Status: Phase 1 Complete ✅

**Ready for Phase 2 Quick Wins!**
