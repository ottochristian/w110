import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type AgeGroupDistribution = {
  ageGroup: string
  count: number
}

function getAgeGroup(birthDate: string | null): string {
  if (!birthDate) return 'Unknown'
  
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  if (age < 6) return 'Under 6'
  if (age <= 8) return '6-8'
  if (age <= 10) return '9-10'
  if (age <= 12) return '11-12'
  if (age <= 14) return '13-14'
  if (age <= 16) return '15-16'
  if (age <= 18) return '17-18'
  return '19+'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')
  const programId = searchParams.get('programId')
  const gender = searchParams.get('gender')

  // Require admin authentication
  const authResult = await requireAdmin(req)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user, supabase, profile } = authResult
  const role = profile.role as ProfileRole
  const isSystemAdmin = role === 'system_admin'
  const clubIdToUse = isSystemAdmin ? requestedClubId : profile.club_id

  if (!seasonId) {
    return NextResponse.json(
      { error: 'seasonId is required' },
      { status: 400 }
    )
  }

  if (!clubIdToUse) {
    return NextResponse.json(
      { error: 'clubId is required' },
      { status: 400 }
    )
  }

  if (!isSystemAdmin && clubIdToUse !== profile.club_id) {
    return NextResponse.json({ error: 'Forbidden: club mismatch' }, { status: 403 })
  }

  if (isSystemAdmin && !requestedClubId) {
    return NextResponse.json(
      { error: 'clubId is required for system admins' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Build base query
  let registrationsQuery = admin
    .from('registrations')
    .select(`
      athlete_id,
      athletes!inner(
        id,
        gender,
        date_of_birth
      ),
      sub_programs!inner(
        id,
        program_id
      )
    `)
    .eq('season_id', seasonId)
    .eq('club_id', clubIdToUse)

  // Apply program filter
  if (programId && programId !== 'all') {
    registrationsQuery = registrationsQuery.eq('sub_programs.program_id', programId)
  }

  // Apply gender filter
  if (gender && gender !== 'all') {
    registrationsQuery = registrationsQuery.eq('athletes.gender', gender)
  }

  const { data: registrations, error: registrationsError } = await registrationsQuery

  if (registrationsError) {
    console.error('Athletes by age error:', registrationsError)
    return NextResponse.json(
      { error: registrationsError.message || 'Failed to load athletes by age' },
      { status: 500 }
    )
  }

  // Group by age and count unique athletes
  const ageGroupMap = new Map<string, Set<string>>()
  
  // Define age group order
  const ageGroupOrder = ['Under 6', '6-8', '9-10', '11-12', '13-14', '15-16', '17-18', '19+', 'Unknown']

  ;(registrations || []).forEach((reg: any) => {
    const birthDate = reg.athletes?.date_of_birth
    const athleteId = reg.athlete_id
    const ageGroup = getAgeGroup(birthDate)

    if (athleteId) {
      if (!ageGroupMap.has(ageGroup)) {
        ageGroupMap.set(ageGroup, new Set())
      }
      ageGroupMap.get(ageGroup)!.add(athleteId)
    }
  })

  const distribution: AgeGroupDistribution[] = ageGroupOrder
    .filter(group => ageGroupMap.has(group))
    .map(group => ({
      ageGroup: group,
      count: ageGroupMap.get(group)!.size,
    }))

  return NextResponse.json({ distribution })
}
