# UI Improvements Guide

**Remaining Work:** Pagination + Loading States  
**Estimated Time:** 5-6 hours  
**Status:** All security & production fixes complete ✅

---

## 📋 What's Left

### 1. Pagination (3-4 hours)
Need to add pagination to:
- ✅ Athletes page (DONE)
- ⏳ Registrations page (1.5 hours)
- ⏳ Orders page (1.5 hours)
- ⏳ Programs page (1 hour)

### 2. Loading Skeletons (2 hours)
Need to add skeleton screens for:
- ⏳ Table loading states
- ⏳ Dashboard cards
- ⏳ Form submissions

### 3. Error Boundaries
- ✅ DONE! (Sentry setup includes error boundaries)

---

## 🎯 Pattern: Pagination Implementation

We've already implemented pagination for athletes. Use this as the template!

### Step 1: Create Paginated Hook

**Example:** `lib/hooks/use-registrations-paginated.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface PaginationParams {
  page: number
  pageSize: number
  search?: string
  filters?: Record<string, any>
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useRegistrationsPaginated(
  seasonId: string | undefined,
  params: PaginationParams
) {
  return useQuery({
    queryKey: ['registrations', 'paginated', seasonId, params],
    queryFn: async () => {
      if (!seasonId) throw new Error('Season required')
      
      const supabase = createClient()
      const { page, pageSize, search, filters } = params
      
      // Build query
      let query = supabase
        .from('registrations')
        .select(`
          *,
          athletes (id, first_name, last_name, date_of_birth, household_id),
          sub_programs!inner (
            id,
            name,
            programs!inner (id, name)
          )
        `, { count: 'exact' })
        .eq('season_id', seasonId)
        .order('created_at', { ascending: false })
      
      // Add search
      if (search) {
        query = query.or(
          `athletes.first_name.ilike.%${search}%,athletes.last_name.ilike.%${search}%`
        )
      }
      
      // Add filters
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus)
      }
      
      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      }
    },
    enabled: !!seasonId,
  })
}
```

### Step 2: Update Page Component

**Key changes:**
1. Replace `useRegistrations` with `useRegistrationsPaginated`
2. Add pagination state (`page`, `pageSize`)
3. Add pagination controls
4. Add search/filter controls

**Example:**
```typescript
const [page, setPage] = useState(1)
const [pageSize] = useState(50)
const [search, setSearch] = useState('')

const { data, isLoading } = useRegistrationsPaginated(seasonId, {
  page,
  pageSize,
  search,
})

// In JSX:
<PaginationControls
  currentPage={data?.page || 1}
  totalPages={data?.totalPages || 1}
  onPageChange={setPage}
/>
```

### Step 3: Add Pagination Component

Already exists! Use `components/ui/pagination.tsx` or copy from athletes page.

---

## 📦 Files to Create/Modify

### For Registrations Pagination:
1. **Create:** `lib/hooks/use-registrations-paginated.ts`
2. **Modify:** `app/clubs/[clubSlug]/admin/registrations/page.tsx`

### For Orders Pagination:
1. **Create:** `lib/hooks/use-orders-paginated.ts`
2. **Find:** Orders page (may not exist yet, check admin dashboard)
3. **Create/Modify:** Orders page with pagination

### For Programs Pagination:
1. **Create:** `lib/hooks/use-programs-paginated.ts`
2. **Modify:** `app/clubs/[clubSlug]/admin/programs/[programId]/edit/page.tsx`
3. Or modify the programs list page if it exists

---

## 🎨 Loading Skeletons Pattern

### Step 1: Create Skeleton Component

**Example:** `components/ui/skeleton.tsx`

```typescript
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

### Step 2: Create Table Skeleton

**Example:** `components/ui/table-skeleton.tsx`

```typescript
import { Skeleton } from './skeleton'

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
```

### Step 3: Use in Pages

```typescript
{isLoading ? (
  <TableSkeleton rows={10} columns={6} />
) : (
  <Table>
    {/* actual data */}
  </Table>
)}
```

---

## 🔍 Where to Add Loading States

### High Priority:
1. **Registrations table** - Replace spinner with skeleton
2. **Athletes table** - Add skeleton (already has pagination)
3. **Dashboard cards** - Add card skeletons
4. **Analytics charts** - Add chart placeholders

### Medium Priority:
5. **Programs list** - Add table skeleton
6. **Orders list** - Add table skeleton
7. **Form submissions** - Disable button + spinner

### Implementation:

```typescript
// Dashboard card skeleton
export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-3 w-[150px] mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-[100px]" />
      </CardContent>
    </Card>
  )
}

// Form loading state
<Button disabled={isSubmitting}>
  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>
```

---

## 📊 Estimated Time Breakdown

### Registrations Pagination (1.5 hours)
- Create `useRegistrationsPaginated` hook (30 min)
- Update page component (45 min)
- Test + refine (15 min)

### Orders Pagination (1.5 hours)
- Find/create orders page (15 min)
- Create `useOrdersPaginated` hook (30 min)
- Update page component (30 min)
- Test + refine (15 min)

### Programs Pagination (1 hour)
- Create `useProgramsPaginated` hook (20 min)
- Update page component (30 min)
- Test + refine (10 min)

### Loading Skeletons (2 hours)
- Create skeleton components (30 min)
- Add to tables (30 min)
- Add to dashboard (30 min)
- Add to forms (30 min)

**Total: 6 hours**

---

## ✅ Testing Checklist

After implementing pagination:
- [ ] Can navigate between pages
- [ ] Search works across pages
- [ ] Filters persist when changing pages
- [ ] Page size selector works
- [ ] Shows correct total count
- [ ] Performance: loads < 1 second
- [ ] No N+1 queries
- [ ] Handles empty state
- [ ] Handles single page (no pagination controls)

After implementing skeletons:
- [ ] Shows skeleton during initial load
- [ ] Shows skeleton during refetch
- [ ] Skeleton matches final layout
- [ ] No layout shift when data loads
- [ ] Skeleton duration feels natural (not too fast/slow)

---

## 🚀 Quick Start

To continue this work:

1. **Start with Registrations (highest traffic):**
   ```bash
   # Create the hook
   touch lib/hooks/use-registrations-paginated.ts
   
   # Copy pattern from use-athletes.ts
   # Modify for registrations schema
   ```

2. **Test it:**
   ```bash
   npm run dev
   # Navigate to /admin/registrations
   # Test pagination, search, filters
   ```

3. **Repeat for Orders and Programs**

4. **Add Skeletons:**
   ```bash
   # Create skeleton component
   npx shadcn-ui@latest add skeleton
   
   # Or create manually in components/ui/skeleton.tsx
   ```

---

## 💡 Pro Tips

1. **Copy from athletes page** - We already solved this problem!
2. **Use React Query's `keepPreviousData`** - Prevents flashing between page changes
3. **Debounce search input** - Better UX, fewer requests
4. **Add URL params** - Persist page/search in URL for sharing/bookmarks
5. **Consider virtual scrolling** - For very large lists (1000+ items)

---

## 📚 Reference: Athletes Pagination (Already Implemented)

Check these files for the working example:
- `lib/hooks/use-athletes.ts` - The paginated hook
- `app/clubs/[clubSlug]/admin/athletes/page.tsx` - The page using it
- `migrations/99_add_batch_waiver_check.sql` - Supporting SQL function

Copy this pattern for registrations, orders, and programs!

---

That's it! Follow this guide and you'll have pagination + loading states done in ~6 hours. 🚀
