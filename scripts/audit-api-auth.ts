#!/usr/bin/env tsx
/**
 * API Authentication Audit Script
 * Checks all API routes for proper authentication
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface RouteAudit {
  path: string
  hasAuth: boolean
  authMethod: string | null
  isPublic: boolean
  notes: string[]
}

// Public routes that don't need auth
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/webhooks/stripe',
  '/api/clubs/public',
  '/api/household-guardians/invitation-info',
  '/api/auth/verify-setup-token',
  '/api/auth/get-user-by-email',
]

// Auth patterns to look for
const AUTH_PATTERNS = {
  requireAuth: /requireAuth\s*\(/,
  requireAdmin: /requireAdmin\s*\(/,
  requireSystemAdmin: /requireSystemAdmin\s*\(/,
  requireCoach: /requireCoach\s*\(/,
  getUser: /supabase\.auth\.getUser\s*\(/,
  sessionGet: /session\.get\s*\(/,
  authHeader: /headers.*authorization/i,
  serviceRole: /SUPABASE_SERVICE_ROLE_KEY/,
}

function findFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir)

  files.forEach((file) => {
    const filePath = join(dir, file)
    const stat = statSync(filePath)

    if (stat.isDirectory()) {
      findFiles(filePath, fileList)
    } else if (file === 'route.ts') {
      fileList.push(filePath)
    }
  })

  return fileList
}

function analyzeRoute(filePath: string): RouteAudit {
  const content = readFileSync(filePath, 'utf-8')
  
  // Convert file path to API route
  const apiPath = filePath
    .replace(/^app/, '')
    .replace(/\/route\.ts$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1')

  const audit: RouteAudit = {
    path: apiPath,
    hasAuth: false,
    authMethod: null,
    isPublic: PUBLIC_ROUTES.some((route) => apiPath.startsWith(route)),
    notes: [],
  }

  // Check for each auth pattern
  if (AUTH_PATTERNS.requireAuth.test(content)) {
    audit.hasAuth = true
    audit.authMethod = 'requireAuth'
  } else if (AUTH_PATTERNS.requireAdmin.test(content)) {
    audit.hasAuth = true
    audit.authMethod = 'requireAdmin'
  } else if (AUTH_PATTERNS.requireSystemAdmin.test(content)) {
    audit.hasAuth = true
    audit.authMethod = 'requireSystemAdmin'
  } else if (AUTH_PATTERNS.requireCoach.test(content)) {
    audit.hasAuth = true
    audit.authMethod = 'requireCoach'
  } else if (AUTH_PATTERNS.getUser.test(content)) {
    audit.hasAuth = true
    audit.authMethod = 'supabase.auth.getUser()'
    audit.notes.push('⚠️  Manual auth - should migrate to requireAuth helper')
  } else if (AUTH_PATTERNS.authHeader.test(content)) {
    audit.hasAuth = true
    audit.authMethod = 'Authorization header check'
    audit.notes.push('⚠️  Manual auth - should migrate to requireAuth helper')
  }

  // Check for service role usage (potential security issue)
  if (AUTH_PATTERNS.serviceRole.test(content)) {
    audit.notes.push('⚠️  Uses service role key - verify this is intentional')
  }

  // Determine if auth is missing
  if (!audit.hasAuth && !audit.isPublic) {
    audit.notes.push('❌ NO AUTHENTICATION FOUND - SECURITY RISK!')
  }

  // Check for rate limiting
  if (!/checkRateLimit|rateLimit/.test(content)) {
    if (!audit.isPublic || apiPath.includes('webhook')) {
      audit.notes.push('⚠️  No rate limiting')
    }
  }

  // Check for input validation
  if (!/validateRequest|zod|\.parse\(/.test(content)) {
    if (content.includes('request.json()')) {
      audit.notes.push('⚠️  No input validation detected')
    }
  }

  return audit
}

function main() {
  console.log('\n🔍 API Authentication Audit')
  console.log('═'.repeat(80))
  console.log()

  const routes = findFiles('app/api')
  const audits = routes.map(analyzeRoute)

  // Categorize routes
  const authenticated = audits.filter((a) => a.hasAuth)
  const unauthenticated = audits.filter((a) => !a.hasAuth && !a.isPublic)
  const publicRoutes = audits.filter((a) => a.isPublic)
  const needsMigration = audits.filter((a) =>
    a.notes.some((n) => n.includes('Manual auth'))
  )

  // Print summary
  console.log('📊 Summary:')
  console.log(`   Total routes: ${audits.length}`)
  console.log(`   ✅ Authenticated: ${authenticated.length}`)
  console.log(`   🌐 Public (intentional): ${publicRoutes.length}`)
  console.log(`   ❌ Missing auth: ${unauthenticated.length}`)
  console.log(`   ⚠️  Needs migration: ${needsMigration.length}`)
  console.log()

  // Print unauthenticated routes (CRITICAL)
  if (unauthenticated.length > 0) {
    console.log('❌ CRITICAL: Routes Missing Authentication')
    console.log('-'.repeat(80))
    unauthenticated.forEach((audit) => {
      console.log(`   ${audit.path}`)
      audit.notes.forEach((note) => console.log(`      ${note}`))
    })
    console.log()
  }

  // Print routes needing migration
  if (needsMigration.length > 0) {
    console.log('⚠️  Routes with Manual Auth (Should Migrate to Helper)')
    console.log('-'.repeat(80))
    needsMigration.forEach((audit) => {
      console.log(`   ${audit.path}`)
      console.log(`      Current: ${audit.authMethod}`)
    })
    console.log()
  }

  // Print all routes by category
  console.log('📋 Detailed Audit:')
  console.log('-'.repeat(80))
  console.log()

  console.log('✅ Authenticated Routes:')
  authenticated.forEach((audit) => {
    console.log(`   ${audit.path}`)
    console.log(`      Auth: ${audit.authMethod}`)
    if (audit.notes.length > 0) {
      audit.notes.forEach((note) => console.log(`      ${note}`))
    }
  })
  console.log()

  console.log('🌐 Public Routes:')
  publicRoutes.forEach((audit) => {
    console.log(`   ${audit.path}`)
    if (audit.notes.length > 0) {
      audit.notes.forEach((note) => console.log(`      ${note}`))
    }
  })
  console.log()

  // Export results
  const results = {
    summary: {
      total: audits.length,
      authenticated: authenticated.length,
      public: publicRoutes.length,
      missingAuth: unauthenticated.length,
      needsMigration: needsMigration.length,
    },
    criticalIssues: unauthenticated.map((a) => a.path),
    needsMigration: needsMigration.map((a) => a.path),
    allRoutes: audits,
  }

  console.log('💾 Results saved to: api-auth-audit-results.json')
  require('fs').writeFileSync(
    'api-auth-audit-results.json',
    JSON.stringify(results, null, 2)
  )

  // Exit with error code if critical issues found
  if (unauthenticated.length > 0) {
    console.log()
    console.log('⚠️  AUDIT FAILED: Found routes without authentication!')
    process.exit(1)
  } else {
    console.log()
    console.log('✅ AUDIT PASSED: All non-public routes have authentication!')
    process.exit(0)
  }
}

main()
