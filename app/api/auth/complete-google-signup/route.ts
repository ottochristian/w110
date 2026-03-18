import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limit: 10 attempts per IP per hour (account creation)
  const rateLimitCheck = checkRateLimit(request, { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { firstName, lastName, phone, clubId } = await request.json()

  if (!firstName || !lastName || !clubId) {
    return NextResponse.json({ error: 'First name, last name, and club are required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create profile (skip if already exists)
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    const { error: profileError } = await admin.from('profiles').insert({
      id: user.id,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      role: 'parent',
      club_id: clubId,
    })

    if (profileError && profileError.code !== '23505') {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
  }

  // Create household
  const { data: household, error: householdError } = await admin
    .from('households')
    .insert({
      club_id: clubId,
      primary_email: user.email,
      phone: phone || null,
    })
    .select('id')
    .single()

  if (householdError) {
    return NextResponse.json({ error: householdError.message }, { status: 500 })
  }

  // Link user to household
  await admin.from('household_guardians').insert({
    household_id: household.id,
    user_id: user.id,
    is_primary: true,
  })

  const { data: club } = await admin
    .from('clubs')
    .select('slug')
    .eq('id', clubId)
    .single()

  return NextResponse.json({ success: true, clubSlug: club?.slug })
}
