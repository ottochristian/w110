import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/api-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  const admin = createSupabaseAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, club_id, role, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'coach' || !profile.club_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: club } = await admin.from('clubs').select('name').eq('id', profile.club_id).single()
  const clubName = club?.name ?? 'the club'

  const body = await request.json()
  const { type, title, detail, target_name, recipient_count, preview_names } = body

  const senderName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Your Coach'
  const previewList = (preview_names ?? []).slice(0, 4).join(', ')

  const systemPrompt = `You are a communication assistant helping a ski coach at ${clubName} write emails to athlete families.
Always return a JSON object with exactly two fields: "subject" (string, concise) and "body" (string, plain text, 3-5 sentences, warm and friendly).
No markdown in the body. No {{ }} placeholders. Write to the group collectively (not individually personalized).`

  const userPrompt = `Write an email for this situation:
Type: ${type}
Situation: ${title}
Detail: ${detail}
Group: ${target_name}
Affected families (example names): ${previewList || 'several families'}
Total: ${recipient_count ?? 'some'} families
Coach name: ${senderName}
Club: ${clubName}

For waiver reminders: explain why signing is important for athlete safety and participation.
For payment reminders: be warm but clear about the deadline.
For event reminders: build excitement and share any logistics.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])

    admin.from('ai_usage').insert({
      club_id: profile.club_id,
      user_id: profile.id,
      feature: 'coach_nudge_draft',
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      model: 'claude-sonnet-4-6',
    }).then(({ error }: { error: unknown }) => { if (error) console.error('[coach nudge draft] usage:', error) })

    return NextResponse.json({ subject: parsed.subject, body: parsed.body })
  } catch (err) {
    console.error('[coach nudge draft] error:', err)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
