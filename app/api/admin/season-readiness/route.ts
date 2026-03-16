import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('seasonId')

  const authResult = await requireAdmin(req)
  if (authResult instanceof NextResponse) return authResult

  const { supabase, profile } = authResult

  if (!seasonId) {
    return NextResponse.json({ error: 'seasonId is required' }, { status: 400 })
  }

  // Verify season belongs to this club
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('id, name, status, club_id')
    .eq('id', seasonId)
    .eq('club_id', profile.club_id)
    .single()

  if (seasonError || !season) {
    return NextResponse.json({ error: 'Season not found' }, { status: 404 })
  }

  // Count programs for this season
  const { count: programCount } = await supabase
    .from('programs')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId)

  // Count sub-programs for this season (via programs join)
  const { count: subProgramCount } = await supabase
    .from('sub_programs')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId)

  // Count sub-programs that have pricing set (registration_fee is not null)
  const { count: pricedSubProgramCount } = await supabase
    .from('sub_programs')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .not('registration_fee', 'is', null)

  // Count coaches for the club (not season-specific)
  const { count: coachCount } = await supabase
    .from('coaches')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', profile.club_id)

  const programs = programCount ?? 0
  const subPrograms = subProgramCount ?? 0
  const pricedSubPrograms = pricedSubProgramCount ?? 0
  const coaches = coachCount ?? 0
  const isActive = season.status === 'active'

  const steps = [
    {
      id: 'programs',
      label: 'Add programs',
      description: 'Create at least one program for this season',
      complete: programs > 0,
      count: programs,
      href: 'programs',
    },
    {
      id: 'sub_programs',
      label: 'Add sub-programs',
      description: 'Each program needs at least one sub-program (age group, level, etc.)',
      complete: subPrograms > 0,
      count: subPrograms,
      href: 'programs',
    },
    {
      id: 'pricing',
      label: 'Set pricing',
      description: 'Set a price for each sub-program',
      complete: subPrograms > 0 && pricedSubPrograms >= subPrograms,
      count: pricedSubPrograms,
      total: subPrograms,
      href: 'programs',
    },
    {
      id: 'coaches',
      label: 'Add coaches',
      description: 'Add at least one coach to your club',
      complete: coaches > 0,
      count: coaches,
      href: 'settings/coaches',
      optional: true,
    },
    {
      id: 'registration_open',
      label: 'Open registration',
      description: 'Activate the season to allow parents to register',
      complete: isActive,
      href: 'settings/seasons',
    },
  ]

  const requiredSteps = steps.filter((s) => !s.optional)
  const completedRequired = requiredSteps.filter((s) => s.complete).length
  const isComplete = requiredSteps.every((s) => s.complete)

  return NextResponse.json({
    season: { id: season.id, name: season.name, status: season.status },
    steps,
    completedCount: completedRequired,
    totalCount: requiredSteps.length,
    isComplete,
  })
}
