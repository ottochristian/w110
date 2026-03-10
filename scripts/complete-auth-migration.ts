#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

const files = glob.sync('app/api/admin/**/route.ts')
  .concat(glob.sync('app/api/athletes/admin-create/route.ts'))
  .concat(glob.sync('app/api/system-admin/**/route.ts'))

console.log(`\n🔍 Found ${files.length} admin routes to check\n`)

let migrated = 0

for (const file of files) {
  let content = readFileSync(file, 'utf-8')
  let changed = false
  
  // Check if it still uses manual auth
  if (!content.includes('supabase.auth.getUser()')) {
    continue
  }
  
  console.log(`📝 ${file}`)
  
  // Add requireAdmin import if not present
  if (!content.includes('requireAdmin')) {
    if (content.includes("import { NextRequest")) {
      content = content.replace(
        /(import { NextRequest.*?\n)/,
        "$1import { requireAdmin } from '@/lib/api-auth'\n"
      )
      changed = true
    }
  }
  
  // Replace the manual auth pattern - try multiple variants
  const patterns = [
    // Pattern 1: Standard with createClient import
    {
      old: /const supabase = await createClient\(\)\s+const\s+{\s+data:\s+{\s+user\s+},\s+}\s+=\s+await\s+supabase\.auth\.getUser\(\)\s+if\s+\(!user\)\s+{\s+return\s+NextResponse\.json\(\s+{\s+error:\s+'Unauthorized'\s+},\s+{\s+status:\s+401\s+}\s+\)\s+}\s+const\s+{\s+data:\s+profile,\s+error:\s+profileError\s+}\s+=\s+await\s+supabase\s+\.from\('profiles'\)\s+\.select\('role,\s+club_id'\)\s+\.eq\('id',\s+user\.id\)\s+\.single\(\)\s+if\s+\(profileError\s+\|\|\s+!profile\)\s+{\s+return\s+NextResponse\.json\(\s+{\s+error:\s+'Unauthorized'\s+},\s+{\s+status:\s+401\s+}\s+\)\s+}\s+const\s+role\s+=\s+profile\.role\s+as\s+ProfileRole\s+const\s+isSystemAdmin\s+=\s+role\s+===\s+'system_admin'\s+const\s+clubIdToUse\s+=\s+isSystemAdmin\s+\?\s+requestedClubId\s+:\s+profile\.club_id/s,
      new: `// Require admin authentication
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user, supabase, profile } = authResult
  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id`
    }
  ]
  
  // Simpler approach - just look for the key section and replace
  if (content.includes('await supabase.auth.getUser()')) {
    // Find and replace the entire auth block
    const authBlockRegex = /(const supabase = await createClient\(\)[\s\S]*?)(\n\n  (?:if \(!seasonId\)|const adminSupabase|\/\/ ))/
    
    if (authBlockRegex.test(content)) {
      content = content.replace(authBlockRegex, (match, authBlock, nextSection) => {
        // Check if this auth block includes the full pattern we want to replace
        if (authBlock.includes('await supabase.auth.getUser()') && 
            authBlock.includes('profile.role as ProfileRole') &&
            authBlock.includes('clubIdToUse')) {
          
          const replacement = `// Require admin authentication
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user, supabase, profile } = authResult
  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id`
          
          return replacement + nextSection
        }
        return match
      })
      
      changed = true
    }
  }
  
  // Remove duplicate imports
  content = content.replace(/import { createClient } from '@\/lib\/supabase\/server'\n/g, '')
  content = content.replace(/import { createAdminClient } from '@\/lib\/supabase\/server'\nimport { createAdminClient } from '@\/lib\/supabase\/server'/g, 
    "import { createAdminClient } from '@/lib/supabase/server'")
  
  if (changed) {
    writeFileSync(file, content, 'utf-8')
    console.log(`   ✅ Migrated\n`)
    migrated++
  } else {
    console.log(`   ⏭️  Skipped (no changes needed)\n`)
  }
}

console.log(`\n✅ Migrated ${migrated} routes`)
