import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type AthleteWithMissingWaivers = {
  athleteId: string
  athleteName: string
  programName: string
  missingWaivers: Array<{ id: string; title: string }>
  guardianName: string
  guardianEmail: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')
  const requestedClubId = searchParams.get('clubId')
  const programId = searchParams.get('programId')

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
    return NextResponse.json({ error: 'seasonId is required' }, { status: 400 })
  }

  if (!clubIdToUse) {
    return NextResponse.json({ error: 'clubId is required' }, { status: 400 })
  }

  if (!isSystemAdmin && clubIdToUse !== profile.club_id) {
    return NextResponse.json({ error: 'Forbidden: club mismatch' }, { status: 403 })
  }

  if (isSystemAdmin && !requestedClubId) {
    return NextResponse.json({ error: 'clubId is required for system admins' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    // 1. Get required waivers
    const { data: requiredWaivers, error: waiversError } = await admin
      .from('waivers')
      .select('id, title')
      .eq('club_id', clubIdToUse)
      .eq('season_id', seasonId)
      .eq('required', true)
      .eq('status', 'active')

    if (waiversError) throw waiversError

    if (!requiredWaivers || requiredWaivers.length === 0) {
      return NextResponse.json([])
    }

    const requiredWaiverIds = requiredWaivers.map((w: any) => w.id)

    // 2. Get all athletes registered in this season with their program and guardian info
    let athletesQuery = admin
      .from('registrations')
      .select(`
        athlete_id,
        athletes!inner(
          id,
          first_name,
          last_name,
          household_id,
          households(
            id,
            household_guardians(
              user_id,
              is_primary,
              profiles(
                id,
                first_name,
                last_name,
                email
              )
            )
          )
        ),
        sub_programs!inner(
          id,
          program_id,
          programs(
            id,
            name
          )
        )
      `)
      .eq('season_id', seasonId)
      .eq('club_id', clubIdToUse)

    if (programId && programId !== 'all') {
      athletesQuery = athletesQuery.eq('sub_programs.program_id', programId)
    }

    const { data: registrations, error: registrationsError } = await athletesQuery

    if (registrationsError) throw registrationsError

    // 3. Get signatures for all athletes
    const athleteIds = Array.from(
      new Set((registrations || []).map((r: any) => r.athlete_id))
    )

    if (athleteIds.length === 0) {
      return NextResponse.json([])
    }

    const { data: signatures, error: signaturesError } = await admin
      .from('waiver_signatures')
      .select('athlete_id, waiver_id')
      .in('athlete_id', athleteIds)
      .in('waiver_id', requiredWaiverIds)

    if (signaturesError) throw signaturesError

    // 4. Build map of athlete -> signed waiver IDs
    const athleteSignatures = new Map<string, Set<string>>()
    signatures?.forEach((sig: any) => {
      if (!athleteSignatures.has(sig.athlete_id)) {
        athleteSignatures.set(sig.athlete_id, new Set())
      }
      athleteSignatures.get(sig.athlete_id)?.add(sig.waiver_id)
    })

    // 5. Find athletes with missing waivers
    const result: AthleteWithMissingWaivers[] = []
    const processedAthletes = new Set<string>()

    for (const reg of registrations || []) {
      const athlete: any = reg.athletes
      if (!athlete || processedAthletes.has(athlete.id)) continue

      processedAthletes.add(athlete.id)

      const signedWaivers = athleteSignatures.get(athlete.id) || new Set()
      
      // Find missing waivers
      const missing = requiredWaivers.filter(
        (w: any) => !signedWaivers.has(w.id)
      )

      if (missing.length > 0) {
        // Get guardian info (prefer primary guardian)
        const household = athlete.households
        const guardians = household?.household_guardians || []
        const primaryGuardian = guardians.find((hg: any) => hg.is_primary)?.profiles
        const anyGuardian = guardians[0]?.profiles
        const guardian = primaryGuardian || anyGuardian

        const programName = (reg as any).sub_programs?.programs?.name || 'Unknown Program'

        result.push({
          athleteId: athlete.id,
          athleteName: `${athlete.first_name} ${athlete.last_name}`,
          programName,
          missingWaivers: missing.map((w: any) => ({
            id: w.id,
            title: w.title,
          })),
          guardianName: guardian 
            ? `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim() 
            : 'Unknown',
          guardianEmail: guardian?.email || '',
        })
      }
    }

    // Sort by athlete name
    result.sort((a, b) => a.athleteName.localeCompare(b.athleteName))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Athletes missing waivers error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load athletes missing waivers' },
      { status: 500 }
    )
  }
}
