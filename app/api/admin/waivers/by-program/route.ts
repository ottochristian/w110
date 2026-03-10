import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'

type ProfileRole = 'parent' | 'coach' | 'admin' | 'system_admin'

type ProgramCompliance = {
  programId: string
  programName: string
  totalAthletes: number
  compliantAthletes: number
  complianceRate: number
}

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
      .select('id')
      .eq('club_id', clubIdToUse)
      .eq('season_id', seasonId)
      .eq('required', true)
      .eq('status', 'active')

    if (waiversError) throw waiversError

    const totalRequired = requiredWaivers?.length || 0

    // 2. Get all registrations with their programs
    const { data: registrations, error: registrationsError } = await admin
      .from('registrations')
      .select(`
        athlete_id,
        sub_programs!inner(
          program_id,
          programs!inner(
            id,
            name
          )
        )
      `)
      .eq('season_id', seasonId)
      .eq('club_id', clubIdToUse)

    if (registrationsError) throw registrationsError

    // 3. Group by program
    const programMap = new Map<string, { id: string; name: string; athleteIds: Set<string> }>()
    
    registrations?.forEach((reg: any) => {
      const program = reg.sub_programs?.programs
      if (program) {
        if (!programMap.has(program.id)) {
          programMap.set(program.id, {
            id: program.id,
            name: program.name,
            athleteIds: new Set(),
          })
        }
        programMap.get(program.id)!.athleteIds.add(reg.athlete_id)
      }
    })

    const programs = Array.from(programMap.values())

    // 4. If no required waivers, all programs have 100% compliance
    if (totalRequired === 0) {
      const result = programs.map((program) => ({
        programId: program.id,
        programName: program.name,
        totalAthletes: program.athleteIds.size,
        compliantAthletes: program.athleteIds.size,
        complianceRate: 100,
      }))
      return NextResponse.json(result)
    }

    // 5. Get all signatures for athletes in this season
    const allAthleteIds = Array.from(
      new Set(
        programs.flatMap((p) => Array.from(p.athleteIds))
      )
    )

    const requiredWaiverIds = requiredWaivers.map((w: any) => w.id)

    const { data: signatures, error: signaturesError } = await admin
      .from('waiver_signatures')
      .select('athlete_id, waiver_id')
      .in('athlete_id', allAthleteIds)
      .in('waiver_id', requiredWaiverIds)

    if (signaturesError) throw signaturesError

    // 6. Build map of athlete -> signed waiver IDs
    const athleteSignatures = new Map<string, Set<string>>()
    signatures?.forEach((sig: any) => {
      if (!athleteSignatures.has(sig.athlete_id)) {
        athleteSignatures.set(sig.athlete_id, new Set())
      }
      athleteSignatures.get(sig.athlete_id)?.add(sig.waiver_id)
    })

    // 7. Calculate compliance for each program
    const result: ProgramCompliance[] = programs.map((program) => {
      let compliantCount = 0
      program.athleteIds.forEach((athleteId: string) => {
        const signedWaivers = athleteSignatures.get(athleteId)
        if (signedWaivers && signedWaivers.size === totalRequired) {
          compliantCount++
        }
      })

      const totalAthletes = program.athleteIds.size
      const complianceRate = totalAthletes > 0 
        ? Math.round((compliantCount / totalAthletes) * 100) 
        : 0

      return {
        programId: program.id,
        programName: program.name,
        totalAthletes,
        compliantAthletes: compliantCount,
        complianceRate,
      }
    })

    // Sort by program name
    result.sort((a, b) => a.programName.localeCompare(b.programName))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Waiver by-program error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load waiver compliance by program' },
      { status: 500 }
    )
  }
}
