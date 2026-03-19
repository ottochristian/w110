import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import { notificationService } from '@/lib/services/notification-service'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult
  if (authResult.profile.role !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: clubRequest, error: fetchError } = await supabase
    .from('club_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (fetchError || !clubRequest) {
    return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
  }

  await supabase
    .from('club_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id)

  notificationService.sendClubRequestDeclined(clubRequest.contact_email, {
    firstName: clubRequest.contact_name.split(' ')[0],
    clubName: clubRequest.club_name,
  }).catch(err => console.error('[reject] declined email error:', err))

  return NextResponse.json({ success: true })
}
