import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/api-auth'
import { createSupabaseAdminClient as createAdminClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  // ── 1. Auth: must be a coach ──────────────────────────────────────────────
  const authResult = await requireCoach(request)
  if (authResult instanceof NextResponse) return authResult
  const { user, profile } = authResult
  const coachClubId = profile.club_id

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: {
    season_id: string
    program_id: string
    sub_program_id?: string | null
    group_id?: string | null
    week_start: string   // ISO date string YYYY-MM-DD
    focus?: string       // optional coaching focus
    notes?: string       // optional extra context
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { season_id, program_id, sub_program_id, group_id, week_start, focus, notes } = body

  if (!season_id || !program_id || !week_start) {
    return NextResponse.json(
      { error: 'season_id, program_id, and week_start are required' },
      { status: 400 }
    )
  }

  // ── 3. Use admin client for all DB validation (no RLS bypass risk — we
  //       explicitly check every foreign key chain ourselves) ─────────────────
  const admin = createAdminClient()

  // ── 4. Verify AI is enabled for this club ────────────────────────────────
  const { data: club, error: clubError } = await admin
    .from('clubs')
    .select('id, name, ai_enabled, ai_training_context')
    .eq('id', coachClubId)
    .single()

  if (clubError || !club) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 })
  }
  if (!club.ai_enabled) {
    return NextResponse.json(
      { error: 'AI features are not enabled for your club. Contact your club administrator.' },
      { status: 403 }
    )
  }

  // ── 5. Verify season belongs to coach's club ──────────────────────────────
  const { data: season, error: seasonError } = await admin
    .from('seasons')
    .select('id, name, club_id')
    .eq('id', season_id)
    .eq('club_id', coachClubId)   // ← club_id lock
    .single()

  if (seasonError || !season) {
    return NextResponse.json(
      { error: 'Season not found or does not belong to your club' },
      { status: 403 }
    )
  }

  // ── 6. Verify program belongs to coach's club + season ───────────────────
  const { data: program, error: programError } = await admin
    .from('programs')
    .select('id, name, description, club_id, season_id')
    .eq('id', program_id)
    .eq('club_id', coachClubId)   // ← club_id lock
    .eq('season_id', season_id)   // ← season lock
    .single()

  if (programError || !program) {
    return NextResponse.json(
      { error: 'Program not found or does not belong to your club/season' },
      { status: 403 }
    )
  }

  // ── 7. Verify sub_program belongs to that program ─────────────────────────
  let subProgram: { id: string; name: string; description: string | null } | null = null
  if (sub_program_id) {
    const { data, error } = await admin
      .from('sub_programs')
      .select('id, name, description, program_id')
      .eq('id', sub_program_id)
      .eq('program_id', program_id)   // ← program lock
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Sub-program not found or does not belong to the selected program' },
        { status: 403 }
      )
    }
    subProgram = data
  }

  // ── 8. Verify group belongs to that sub_program ───────────────────────────
  let group: { id: string; name: string } | null = null
  if (group_id) {
    if (!sub_program_id) {
      return NextResponse.json(
        { error: 'A sub-program must be selected when specifying a group' },
        { status: 400 }
      )
    }
    const { data, error } = await admin
      .from('groups')
      .select('id, name, sub_program_id')
      .eq('id', group_id)
      .eq('sub_program_id', sub_program_id)   // ← sub_program lock
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Group not found or does not belong to the selected sub-program' },
        { status: 403 }
      )
    }
    group = data
  }

  // ── 9. Build context and call Claude ─────────────────────────────────────
  const weekStartDate = new Date(week_start)
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const scope = [
    `Program: ${program.name}`,
    subProgram ? `Sub-program: ${subProgram.name}` : null,
    group ? `Group: ${group.name}` : null,
  ].filter(Boolean).join(' › ')

  const prompt = `You are an expert ski coach building a weekly training plan for a competitive ski club. You follow the US Ski & Snowboard Long-Term Athlete Development framework.

## US SKI & SNOWBOARD LTAD FRAMEWORK (apply this to all plans)

The USSA training matrix defines 6 development phases:

**Phase 1 — Foundation (Pre-Puberty, ~6-9 yrs):** Emphasis on play, fun skiing, basic motor skills, balance/coordination. Ski ~3 days/week. No structured training — games and exploration only.

**Phase 2 — Foundation (Pre-Puberty, ~9-11 yrs):** Fun, basic agility, balance, coordination. Introduce explosiveness (≤10 sec) and general endurance. Sensitivity windows: suppleness, speed, beginning of skills. Play many other sports.

**Phase 3 — Pre/Puberty (~11-14 yrs):** 4-6 training sessions/week year-round. Aerobic training and speed play emphasis. Own bodyweight training and body awareness. Sensitivity windows: skills, stamina, speed. Introduce fun competition (Jan–April). Annual volume building.

**Phase 4 — Puberty/Growth Spurt (~13-15 yrs):** Train 5-7 days/2 sessions some days. Competition period Dec–April, 15-25 race starts. Annual training volume at least 300 hours by age 14. Sensitivity windows: stamina, speed, strength (females). Periodized program with stress/recovery cycles. Both low-intensity aerobic AND high-intensity aerobic/anaerobic training. Athlete maintains training log.

**Phase 5 — Post-Puberty (~15-17 yrs):** 9-11 sessions/week in-season, 7-9 out-of-season. Competition period Nov–April, 20-35 race starts. All training components periodized and individualized. Athlete implements periodized program. Training log mandatory.

**Phase 6 — Full Maturation (17+ yrs):** 9-11 sessions/week in-season. Compete at highest appropriate level including FIS, Continental Cups, World Juniors. All components fully periodized and individualized.

**Key periodization principles from the framework:**
- Training stress followed by adequate recovery (supercompensation)
- Low-intensity aerobic base (Zone 1-2) forms majority of volume in early phases
- High-intensity aerobic and anaerobic work increases with maturation
- Sensitivity windows: target supple ness/speed early, stamina mid-development, strength late puberty
- Cross-training and complementary sports remain important through Phase 4
- Technical mastery precedes tactical development precedes physical peak
- Race fitness built through combination of low-intensity volume + high-intensity sharpening

---

CLUB & CONTEXT
- Club: ${club.name}
- Season: ${season.name}
- Scope: ${scope}
- Week: ${formatDate(weekStartDate)} – ${formatDate(weekEndDate)}
${club.ai_training_context ? `- Club training context: ${club.ai_training_context}` : ''}
${focus ? `- Coaching focus this week: ${focus}` : ''}
${notes ? `- Additional context: ${notes}` : ''}
${program.description ? `- Program description: ${program.description}` : ''}
${subProgram?.description ? `- Sub-program description: ${subProgram.description}` : ''}

TASK
Using the USSA LTAD framework above as your scientific foundation, generate a complete, practical weekly training plan. Infer the appropriate development phase from the program/sub-program name and apply the correct training emphasis, volume, and intensity ratios for that phase.

Structure your response EXACTLY as follows (use these exact section headings):

## Weekly Theme
One sentence capturing the week's overarching goal, grounded in the appropriate LTAD phase.

## Development Phase
Identify which USSA LTAD phase this group is in and briefly explain the training priorities that follow from it.

## Week at a Glance
A brief 2-3 sentence summary of the training week structure, including approximate weekly volume and intensity distribution (e.g. "70% aerobic base, 20% technique, 10% speed work").

## Daily Sessions

For each training day (typically Monday through Friday, with Saturday optional for races/gates, Sunday rest), include:

### [Day], [Date]
**Session Type:** (On-snow / Dryland / Gym / Rest / Race)
**Duration:** X hours
**Location:** (suggest appropriate venue type)

**Warm-Up** (10-15 min)
- Specific warm-up activities

**Main Set**
- Detailed drills, gate sets, or exercises with repetitions/durations and coaching cues
- Reference relevant LTAD sensitivity windows where applicable

**Cool-Down** (5-10 min)
- Cool-down activities

**Key Coaching Points**
- Bullet points of what coaches should watch and correct

**Equipment**
- List required equipment

---

## Weekly Coaching Notes
Tactical and technical points for coaches to emphasise across the week, with reference to the LTAD phase priorities.

## Safety & Risk Management
Specific safety reminders relevant to this week's training.

## Athlete Communication
A short note coaches can share with athletes and parents about the week's focus.

Keep the plan realistic and specific to the discipline (alpine, freestyle, Nordic, or other as indicated by the program name). Use appropriate technical terminology for the discipline. Ensure volume and intensity align with the identified LTAD phase.

Keep the plan realistic and specific to the discipline (alpine, freestyle, Nordic, or other as indicated by the program name). Use appropriate technical terminology for the discipline. Ensure volume and intensity align with the identified LTAD phase.`

  // ── 10. Stream the response ───────────────────────────────────────────────
  const contextHeader = JSON.stringify({
    club: club.name,
    season: season.name,
    program: program.name,
    sub_program: subProgram?.name ?? null,
    group: group?.name ?? null,
    week_start,
  })

  const messageStream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  let planId: string | null = null
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        let fullText = ''
        for await (const event of messageStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
            fullText += event.delta.text
          }
        }
        // Save plan + log usage after stream completes (fire-and-forget)
        const finalMsg = await messageStream.finalMessage()

        // Find coach row for this user
        const { data: coachRow } = await admin
          .from('coaches')
          .select('id')
          .eq('profile_id', user.id)
          .single()

        if (coachRow) {
          const { data: savedPlan } = await admin
            .from('ai_training_plans')
            .insert({
              club_id: coachClubId,
              coach_id: coachRow.id,
              season_id,
              program_id,
              sub_program_id: sub_program_id ?? null,
              group_id: group_id ?? null,
              week_start,
              original_plan: fullText,
              plan_context: JSON.parse(contextHeader),
            })
            .select('id')
            .single()
          if (savedPlan) planId = savedPlan.id
        }

        admin
          .from('ai_usage')
          .insert({
            club_id: coachClubId,
            user_id: user.id,
            feature: 'training_plan',
            prompt_tokens: finalMsg.usage.input_tokens,
            completion_tokens: finalMsg.usage.output_tokens,
            model: 'claude-sonnet-4-6',
            metadata: {
              season_id,
              program_id,
              sub_program_id: sub_program_id ?? null,
              group_id: group_id ?? null,
              week_start,
            },
          })
          .then(({ error }: { error: unknown }) => {
            if (error) console.error('ai_usage insert error:', error)
          })
      } catch (err: unknown) {
        const errObj = err as Record<string, unknown>
        console.error('[training-plan] Stream error:', {
          message: errObj?.message,
          status: errObj?.status,
          error: errObj?.error,
          raw: String(err),
        })
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Plan-Context': contextHeader,
  }
  if (planId) responseHeaders['X-Plan-Id'] = planId

  return new Response(readable, { headers: responseHeaders })
}
