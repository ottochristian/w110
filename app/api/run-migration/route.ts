import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

/**
 * Migration Runner API
 * 
 * SECURITY: Only use in development! Remove before production!
 * 
 * GET /api/run-migration?file=60_add_application_metrics.sql
 */
export async function GET(request: NextRequest) {
  // SECURITY CHECK: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Migration runner is disabled in production' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('file') || '60_add_application_metrics.sql'

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', filename)
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json(
        { error: `Migration file not found: ${filename}` },
        { status: 404 }
      )
    }

    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Execute the SQL
    // Note: Supabase client doesn't directly support arbitrary SQL execution
    // We need to use the REST API directly
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
        },
        body: JSON.stringify({ query: sql })
      }
    )

    // Alternative: Just return instructions
    return NextResponse.json({
      success: false,
      message: 'Direct SQL execution requires Supabase Dashboard',
      instructions: {
        step1: 'Go to Supabase Dashboard SQL Editor',
        step2: `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0]}/sql`,
        step3: 'Copy the SQL below',
        step4: 'Paste and click RUN',
        sql: sql
      },
      migrationPreview: sql.substring(0, 500) + '...'
    })

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to run migration',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
