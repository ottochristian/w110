import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')

  // Require admin authentication
  const authResult = await requireAdmin(req)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user, supabase, profile } = authResult
  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id

  // Fetch programs for the club
  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('id, name')
    .eq('club_id', clubIdToUse)
    .order('name')

  if (programsError) {
    return NextResponse.json(
      { error: programsError.message || 'Failed to load programs' },
      { status: 500 }
    )
  }

  // Deduplicate programs by name (keep first occurrence)
  const uniquePrograms = programs?.reduce((acc: any[], program: any) => {
    if (!acc.find(p => p.name === program.name)) {
      acc.push(program)
    }
    return acc
  }, []) || []

  return NextResponse.json({ programs: uniquePrograms })
}
