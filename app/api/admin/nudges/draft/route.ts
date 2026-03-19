import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/api-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult
  const { profile } = authResult

  const clubId = profile.club_id
  if (!clubId) return NextResponse.json({ error: 'No club' }, { status: 403 })

  const body = await request.json()
  const { type, title, detail, target_name, recipient_count } = body

  const admin = createSupabaseAdminClient()
  const [{ data: club }, { data: fullProfile }] = await Promise.all([
    admin.from('clubs').select('name').eq('id', clubId).single(),
    admin.from('profiles').select('first_name, last_name').eq('id', profile.id).single(),
  ])
  const clubName = club?.name ?? 'the club'
  const senderName = [fullProfile?.first_name, fullProfile?.last_name].filter(Boolean).join(' ') || 'The Admin Team'

  const systemPrompt = `You are a communication assistant for ${clubName}, a ski club. Write a short, warm, professional email from the admin team to families.
Always return a JSON object with exactly two fields: "subject" (string, concise) and "body" (string, plain text, 3-5 sentences).
No markdown, no placeholders, no {{ }} fields. Write directly to the families as a group.`

  const userPrompt = `Write an email for this situation:
Type: ${type}
Situation: ${title}
Detail: ${detail}
Target group: ${target_name}
Number of affected families: ${recipient_count}
Sender: ${senderName} at ${clubName}

Keep it friendly but clear. For waiver reminders, explain why it matters. For payment reminders, be polite but firm.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])

    // Log usage
    admin.from('ai_usage').insert({
      club_id: clubId,
      user_id: profile.id,
      feature: 'nudge_draft',
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      model: 'claude-sonnet-4-6',
    }).then(({ error }: { error: unknown }) => { if (error) console.error('[nudge draft] usage log:', error) })

    return NextResponse.json({ subject: parsed.subject, body: parsed.body })
  } catch (err) {
    console.error('[nudge draft] error:', err)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
