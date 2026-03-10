#!/usr/bin/env tsx
/**
 * Batch migrate admin routes to use requireAdmin helper
 */

import { readFileSync, writeFileSync } from 'fs'

const routes = [
  'app/api/admin/athletes/by-age/route.ts',
  'app/api/admin/athletes/by-gender/route.ts',
  'app/api/admin/athletes/by-program/route.ts',
  'app/api/admin/programs/route.ts',
  'app/api/admin/programs/analytics/route.ts',
  'app/api/admin/registrations/by-sport/route.ts',
  'app/api/admin/registrations/program-timeseries/route.ts',
  'app/api/admin/registrations/revenue-timeseries/route.ts',
  'app/api/admin/revenue/by-method/route.ts',
  'app/api/admin/revenue/by-program/route.ts',
  'app/api/admin/revenue/cumulative/route.ts',
  'app/api/admin/revenue/outstanding/route.ts',
  'app/api/admin/waivers/by-program/route.ts',
  'app/api/admin/waivers/details/route.ts',
  'app/api/admin/waivers/missing/route.ts',
  'app/api/admin/waivers/summary/route.ts',
  'app/api/admin/waivers/timeline/route.ts',
  'app/api/athletes/admin-create/route.ts',
]

let totalMigrated = 0
let totalErrors = 0

for (const routePath of routes) {
  try {
    console.log(`\n📝 Migrating: ${routePath}`)
    
    let content = readFileSync(routePath, 'utf-8')
    
    // Track if changes were made
    let changed = false
    
    // Step 1: Add import if not present
    if (!content.includes('requireAdmin')) {
      // Find the import section and add our import
      if (content.includes("from '@/lib/supabase/server'")) {
        content = content.replace(
          /import { createClient } from '@\/lib\/supabase\/server'/,
          "import { requireAdmin } from '@/lib/api-auth'"
        )
        
        // Keep createAdminClient if it exists
        if (content.includes('createAdminClient')) {
          content = content.replace(
            "import { requireAdmin } from '@/lib/api-auth'",
            "import { requireAdmin } from '@/lib/api-auth'\nimport { createAdminClient } from '@/lib/supabase/server'"
          )
        }
        changed = true
      }
    }
    
    // Step 2: Replace the auth pattern
    const oldPattern = `const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin
    ? requestedClubId
    : profile.club_id`
    
    const newPattern = `// Require admin authentication
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user, supabase, profile } = authResult
  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id`
    
    if (content.includes('supabase.auth.getUser()')) {
      content = content.replace(oldPattern, newPattern)
      changed = true
    }
    
    if (changed) {
      writeFileSync(routePath, content, 'utf-8')
      console.log(`   ✅ Migrated successfully`)
      totalMigrated++
    } else {
      console.log(`   ⏭️  No changes needed or already migrated`)
    }
    
  } catch (error) {
    console.error(`   ❌ Error: ${error}`)
    totalErrors++
  }
}

console.log(`\n${'═'.repeat(60)}`)
console.log(`✅ Migration Complete!`)
console.log(`   Migrated: ${totalMigrated}`)
console.log(`   Errors: ${totalErrors}`)
console.log(`   Total: ${routes.length}`)
console.log('═'.repeat(60))
