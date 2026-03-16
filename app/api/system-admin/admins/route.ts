import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'

/**
 * System Admin Admins API
 * Returns all club admins with their clubs and sign-in data
 * 
 * GET /api/system-admin/admins
 * 
 * Requires: System admin authentication
 * Uses service role to bypass RLS
 */
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { profile } = authResult

  // Only system admins can access this
  if (profile.role !== 'system_admin') {
    return NextResponse.json(
      { error: 'Forbidden: System admin access required' },
      { status: 403 }
    )
  }

  // Use admin client to bypass RLS
  const supabase = createAdminClient()

  try {
    // Get all clubs
    const { data: clubs, error: clubsError } = await supabase
      .from('clubs')
      .select('id, name, slug')
      .order('name', { ascending: true })

    if (clubsError) {
      throw clubsError
    }

    // Get all admin profiles with their clubs
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        club_id,
        created_at,
        clubs!inner(name)
      `)
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    if (adminsError) {
      throw adminsError
    }

    // Get sign-in data from auth.users
    const { data: authData } = await supabase.auth.admin.listUsers()
    const authUserMap = new Map(
      authData?.users?.map(u => [u.email, u.last_sign_in_at]) || []
    )

    // Combine data
    const adminsWithData = (admins || []).map(admin => ({
      id: admin.id,
      email: admin.email,
      first_name: admin.first_name,
      last_name: admin.last_name,
      club_id: admin.club_id,
      club_name: (admin.clubs as any)?.name || null,
      created_at: admin.created_at,
      last_sign_in_at: authUserMap.get(admin.email) || null
    }))

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      admins: adminsWithData,
      clubs: clubs || []
    })

  } catch (error: any) {
    console.error('Error fetching admins:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admins' },
      { status: 500 }
    )
  }
}
