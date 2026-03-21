import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

import type { SupabaseClient } from '@supabase/supabase-js'

const VALID_ROLES = ['parent', 'coach', 'admin', 'system_admin']

async function ensureHousehold(admin: SupabaseClient, userId: string) {
  const { data: existing } = await admin
    .from('household_guardians')
    .select('household_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return // already has one

  const { data: profile } = await admin
    .from('profiles')
    .select('email, club_id')
    .eq('id', userId)
    .single()

  if (!profile?.club_id) return // can't create without a club

  const { data: household } = await admin
    .from('households')
    .insert({ club_id: profile.club_id, primary_email: profile.email })
    .select('id')
    .single()

  if (!household) return

  await admin.from('household_guardians').insert({
    household_id: household.id,
    user_id: userId,
    is_primary: true,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify caller is system_admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { role } = await request.json()
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent self-demotion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If downgrading to parent, ensure they have a household
    if (role === 'parent') {
      await ensureHousehold(adminClient, userId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
