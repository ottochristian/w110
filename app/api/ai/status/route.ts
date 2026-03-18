import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/api-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// GET — returns ai_enabled for the authenticated coach's club
export async function GET(request: NextRequest) {
  const authResult = await requireCoach(request)
  if (authResult instanceof NextResponse) return authResult

  const { profile } = authResult

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('clubs')
    .select('ai_enabled')
    .eq('id', profile.club_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ ai_enabled: false }, { status: 200 })
  }

  return NextResponse.json({ ai_enabled: data.ai_enabled })
}
