import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/api-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// GET — return cached summary for this coach
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user, supabase } = authResult

  const admin = createSupabaseAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: club } = await admin
    .from('clubs')
    .select('ai_enabled')
    .eq('id', profile.club_id)
    .single()

  if (!club?.ai_enabled) {
    return NextResponse.json({ summary_text: null, ai_enabled: false })
  }

  const { data } = await admin
    .from('coach_insights')
    .select('summary_text, generated_at')
    .eq('coach_profile_id', user.id)
    .single()

  return NextResponse.json({
    ai_enabled: true,
    summary_text: data?.summary_text ?? null,
    generated_at: data?.generated_at ?? null,
  })
}

// POST — generate a fresh AI summary for this coach, stream it, cache it
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user, supabase } = authResult

  const admin = createSupabaseAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: club } = await admin
    .from('clubs')
    .select('id, name, ai_enabled')
    .eq('id', profile.club_id)
    .single()

  if (!club?.ai_enabled) {
    return NextResponse.json({ error: 'AI features are not enabled for your club.' }, { status: 403 })
  }

  // Get coach row
  const { data: coachRow } = await admin
    .from('coaches')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!coachRow) {
    return NextResponse.json({ error: 'Coach profile not found' }, { status: 404 })
  }

  // Get active season
  const { data: season } = await admin
    .from('seasons')
    .select('id, name')
    .eq('club_id', club.id)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  const seasonId = season?.id ?? null
  const seasonName = season?.name ?? 'Unknown Season'

  // Resolve coach's assigned groups/sub_programs/programs
  const { data: assignments } = await admin
    .from('coach_assignments')
    .select('program_id, sub_program_id, group_id')
    .eq('coach_id', coachRow.id)

  const assignedGroupIds: string[] = []
  const assignedSpIds = new Set<string>()

  for (const a of assignments ?? []) {
    if (a.group_id) assignedGroupIds.push(a.group_id)
    if (a.sub_program_id) assignedSpIds.add(a.sub_program_id)
    if (a.program_id && !a.sub_program_id && !a.group_id) {
      const { data: sps } = await admin.from('sub_programs').select('id').eq('program_id', a.program_id)
      sps?.forEach((sp: { id: string }) => assignedSpIds.add(sp.id))
    }
  }

  if (assignedGroupIds.length > 0) {
    const { data: groupRows } = await admin
      .from('groups')
      .select('id, name, sub_program_id')
      .in('id', assignedGroupIds)
    groupRows?.forEach((g: { sub_program_id: string | null }) => {
      if (g.sub_program_id) assignedSpIds.add(g.sub_program_id)
    })
  }

  const spIds = [...assignedSpIds]
  const groupIds = assignedGroupIds

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch data scoped to this coach
  const [athletesResult, waiversResult, signaturesResult, eventsResult, messagesResult] = await Promise.all([
    // Athletes in assigned groups/sub_programs
    spIds.length > 0
      ? admin
          .from('registrations')
          .select('id, athletes(first_name, last_name), sub_programs(name, programs(name)), group_id')
          .in('sub_program_id', spIds)
          .eq('club_id', club.id)
          .neq('status', 'cancelled')
          .eq(seasonId ? 'season_id' : 'club_id', seasonId ?? club.id)
      : Promise.resolve({ data: [] }),

    // Required waivers
    seasonId
      ? admin.from('waivers').select('id, title').eq('club_id', club.id).eq('season_id', seasonId).eq('required', true)
      : Promise.resolve({ data: [] }),

    // Waiver signatures
    seasonId
      ? admin.from('waiver_signatures').select('athlete_id, waiver_id')
      : Promise.resolve({ data: [] }),

    // Upcoming events in assigned groups
    groupIds.length > 0
      ? admin
          .from('events')
          .select('id, title, event_type, start_at')
          .in('group_id', groupIds)
          .gte('start_at', now.toISOString())
          .lte('start_at', sevenDaysAhead)
          .order('start_at', { ascending: true })
      : Promise.resolve({ data: [] }),

    // Messages sent by this coach in last 30 days
    admin
      .from('messages')
      .select('id, subject, sent_at')
      .eq('sender_id', user.id)
      .gte('sent_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false }),
  ])

  const athletes = athletesResult.data ?? []
  const waivers = waiversResult.data ?? []
  const signatures = signaturesResult.data ?? []
  const events = eventsResult.data ?? []
  const recentMessages = messagesResult.data ?? []

  // Waiver completion
  const waiverIds = new Set(waivers.map((w: { id: string }) => w.id))
  const signedAthletes = new Set(
    signatures
      .filter((s: { waiver_id: string }) => waiverIds.has(s.waiver_id))
      .map((s: { athlete_id: string }) => s.athlete_id)
  )
  const totalAthletes = athletes.length
  const waiversSigned = signedAthletes.size
  const waiversOutstanding = Math.max(0, totalAthletes - waiversSigned)

  // Group breakdown
  const bySubProgram: Record<string, number> = {}
  for (const reg of athletes) {
    const sp = (reg.sub_programs as { name?: string } | null)?.name ?? 'Unknown'
    bySubProgram[sp] = (bySubProgram[sp] ?? 0) + 1
  }

  const coachName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Coach'

  const dataContext = `
Coach: ${coachName}
Club: ${club.name}
Season: ${seasonName}
Report Period: Last 7 days

ATHLETES IN YOUR PROGRAMS:
- Total: ${totalAthletes}
- By sub-program: ${Object.entries(bySubProgram).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}

WAIVERS:
- Required waivers: ${waivers.length} (${waivers.map((w: { title: string }) => w.title).join(', ') || 'none'})
- Athletes who have signed: ${waiversSigned} of ${totalAthletes}
- Outstanding: ${waiversOutstanding}

UPCOMING EVENTS (next 7 days):
${events.length === 0
  ? '- None scheduled'
  : events.map((ev: { title: string; event_type: string; start_at: string }) => {
      const dt = new Date(ev.start_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      return `- ${ev.title} (${ev.event_type}) — ${dt}`
    }).join('\n')
}

RECENT MESSAGES (last 30 days):
- Sent: ${recentMessages.length}
${recentMessages.slice(0, 3).map((m: { subject: string; sent_at: string }) => `- "${m.subject}" (${new Date(m.sent_at).toLocaleDateString()})`).join('\n') || '- None'}
`.trim()

  const systemPrompt = `You are an AI assistant generating a concise weekly summary for ${coachName}, a ski coach.
Write a short, professional summary in plain text with 3-4 sections.
Use this structure:
## Overview
## Athletes & Waivers
## Upcoming
## Action Items

Keep each section to 2-3 sentences or a short bulleted list. Be factual and specific — use the numbers provided. Do not invent data. Tone: friendly and direct, suited for a coach.`

  const userPrompt = `Here is this week's data for your programs:\n\n${dataContext}\n\nGenerate the weekly insights summary.`

  const encoder = new TextEncoder()
  let fullText = ''

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }

        // Cache in coach_insights table (upsert by coach_profile_id)
        await admin
          .from('coach_insights')
          .upsert(
            {
              coach_profile_id: user.id,
              club_id: club.id,
              season_id: seasonId,
              summary_text: fullText,
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'coach_profile_id' }
          )

        // Log usage
        const final = await stream.finalMessage()
        admin.from('ai_usage').insert({
          club_id: club.id,
          user_id: user.id,
          feature: 'coach_insights',
          prompt_tokens: final.usage.input_tokens,
          completion_tokens: final.usage.output_tokens,
          model: 'claude-sonnet-4-6',
          metadata: { season_id: seasonId },
        }).then(({ error }: { error: unknown }) => { if (error) console.error('[coach/insights] ai_usage:', error) })
      } catch (err) {
        console.error('[coach/insights] stream error:', err)
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
