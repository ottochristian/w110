import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/api-auth'
import { log } from '@/lib/logger'

// POST /api/admin/stripe/connect/disconnect
// Body: { clubId: string }
// Auth: requireAdmin (system_admin or club admin)
// Clears Stripe Connect fields from DB (does not delete Stripe account)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { profile } = authResult

    const body = await request.json()
    const { clubId } = body

    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 })
    }

    // Verify access
    if (profile.role !== 'system_admin' && profile.club_id !== clubId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()

    const { error: updateError } = await supabase
      .from('clubs')
      .update({
        stripe_account_id: null,
        stripe_connect_status: 'not_connected',
        stripe_onboarding_completed_at: null,
      })
      .eq('id', clubId)

    if (updateError) {
      log.error('Failed to disconnect Stripe account', updateError, { clubId })
      return NextResponse.json({ error: 'Failed to disconnect Stripe account' }, { status: 500 })
    }

    log.info('Stripe Connect disconnected', { clubId })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Stripe Connect disconnect error', error)
    return NextResponse.json({ error: 'Failed to disconnect Stripe account' }, { status: 500 })
  }
}
