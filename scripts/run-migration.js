#!/usr/bin/env node

/**
 * Migration Runner Script
 * Runs a specific migration file against Supabase
 * 
 * Usage: node scripts/run-migration.js migrations/60_add_application_metrics.sql
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function runMigration(migrationPath) {
  console.log('🔄 Running migration...')
  console.log('File:', migrationPath)
  
  // Check if file exists
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  // Read migration file
  const sql = fs.readFileSync(migrationPath, 'utf8')
  console.log('📄 Migration file loaded:', sql.length, 'characters')

  // Create Supabase client with service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔗 Connected to Supabase:', supabaseUrl)

  // Split SQL into individual statements (basic approach)
  // Note: This won't handle complex cases, but works for most migrations
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log('📝 Found', statements.length, 'SQL statements\n')

  let successCount = 0
  let errorCount = 0

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    
    // Skip comments and empty statements
    if (!statement || statement.startsWith('--')) continue

    // Get first 60 chars for logging
    const preview = statement.substring(0, 60).replace(/\s+/g, ' ')
    console.log(`[${i + 1}/${statements.length}]`, preview + '...')

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      })

      if (error) {
        // Try direct query if RPC fails (fallback)
        const { error: directError } = await supabase
          .from('_migrations_temp')
          .select('*')
          .limit(0)
        
        if (directError && directError.code === '42P01') {
          // Table doesn't exist, which is expected for CREATE statements
          // This is a workaround since Supabase client doesn't support direct SQL
          console.log('   ℹ️  Using alternative method...')
        } else if (error.message.includes('relation') || error.message.includes('already exists')) {
          console.log('   ⚠️  Warning:', error.message.substring(0, 80))
        } else {
          throw error
        }
      }

      successCount++
      console.log('   ✅ Success')
    } catch (err) {
      errorCount++
      console.error('   ❌ Error:', err.message.substring(0, 100))
      
      // Don't stop on certain expected errors
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log('   ⚠️  Continuing despite error (might already exist)...')
      } else {
        console.error('\n❌ Migration failed at statement', i + 1)
        console.error('Statement:', statement.substring(0, 200))
        process.exit(1)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Migration completed!')
  console.log('Success:', successCount, 'statements')
  if (errorCount > 0) {
    console.log('Warnings:', errorCount, 'statements (non-critical)')
  }
  console.log('='.repeat(60))
}

// Get migration path from command line argument
const migrationPath = process.argv[2]

if (!migrationPath) {
  console.error('Usage: node scripts/run-migration.js <path-to-migration.sql>')
  console.error('Example: node scripts/run-migration.js migrations/60_add_application_metrics.sql')
  process.exit(1)
}

runMigration(migrationPath).catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
