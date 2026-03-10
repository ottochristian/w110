#!/usr/bin/env tsx
/**
 * Add input validation to all API routes that need it
 */

import { readFileSync, writeFileSync } from 'fs'

interface RouteValidation {
  path: string
  schema: string
  importName: string
}

const routesToValidate: RouteValidation[] = [
  {
    path: 'app/api/registrations/create/route.ts',
    schema: 'createRegistrationSchema',
    importName: 'createRegistrationSchema',
  },
  {
    path: 'app/api/coaches/invite/route.ts',
    schema: 'inviteCoachSchema',
    importName: 'inviteCoachSchema',
  },
  {
    path: 'app/api/household-guardians/accept/route.ts',
    schema: 'acceptGuardianSchema',
    importName: 'acceptGuardianSchema',
  },
  {
    path: 'app/api/household-guardians/resend/route.ts',
    schema: 'resendGuardianSchema',
    importName: 'resendGuardianSchema',
  },
  {
    path: 'app/api/system-admin/invite-admin/route.ts',
    schema: 'systemAdminInviteSchema',
    importName: 'systemAdminInviteSchema',
  },
  {
    path: 'app/api/otp/verify/route.ts',
    schema: 'otpSchema',
    importName: 'otpSchema',
  },
  {
    path: 'app/api/otp/send/route.ts',
    schema: 'otpSchema',
    importName: 'otpSchema',
  },
]

function addValidationImport(content: string, importName: string): string {
  // Check if validation is already imported
  if (content.includes("from '@/lib/validation'")) {
    // Add to existing import
    const validationImportRegex = /import { ([^}]+) } from '@\/lib\/validation'/
    const match = content.match(validationImportRegex)
    
    if (match && !match[1].includes(importName)) {
      return content.replace(
        validationImportRegex,
        `import { ${match[1]}, ${importName}, ValidationError } from '@/lib/validation'`
      )
    }
  } else {
    // Add new import after other imports
    const lastImportRegex = /(import .* from .*\n)(?!import)/
    return content.replace(
      lastImportRegex,
      `$1import { ${importName}, ValidationError } from '@/lib/validation'\nimport { z } from 'zod'\n`
    )
  }
  
  return content
}

function addValidation(content: string, schema: string): string {
  // Find the line where request.json() is called
  const jsonParseRegex = /(const (?:body|data|\w+) = await request\.json\(\))/
  
  if (!jsonParseRegex.test(content)) {
    console.log('   ⚠️  No request.json() found')
    return content
  }
  
  // Replace with validation
  const validationCode = `// Validate request body
    let validatedData
    try {
      const body = await request.json()
      validatedData = ${schema}.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            validationErrors: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        )
      }
      throw error
    }
    
    const body = validatedData`
  
  return content.replace(jsonParseRegex, validationCode)
}

console.log('\n🔒 Adding Input Validation to All Routes\n')

let success = 0
let skipped = 0
let errors = 0

for (const route of routesToValidate) {
  try {
    console.log(`📝 ${route.path}`)
    
    let content = readFileSync(route.path, 'utf-8')
    
    // Check if already has validation
    if (content.includes('.parse(') || content.includes('validateRequest')) {
      console.log('   ✅ Already has validation\n')
      skipped++
      continue
    }
    
    // Add import
    content = addValidationImport(content, route.importName)
    
    // Add validation
    const newContent = addValidation(content, route.schema)
    
    if (newContent === content) {
      console.log('   ⏭️  No changes made\n')
      skipped++
      continue
    }
    
    writeFileSync(route.path, newContent, 'utf-8')
    console.log('   ✅ Validation added\n')
    success++
    
  } catch (error) {
    console.error(`   ❌ Error: ${error}\n`)
    errors++
  }
}

console.log('═'.repeat(60))
console.log(`✅ Complete!`)
console.log(`   Added: ${success}`)
console.log(`   Skipped: ${skipped}`)
console.log(`   Errors: ${errors}`)
console.log('═'.repeat(60))
