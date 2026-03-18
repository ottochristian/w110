import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/api-auth'
import { log } from '@/lib/logger'
import Stripe from 'stripe'

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  })
}

// GET /api/admin/stripe/connect/status?clubId=xxx
// Auth: requireAdmin
// Returns: { status, chargesEnabled, payoutsEnabled, accountId }
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { profile } = authResult

    const clubId = request.nextUrl.searchParams.get('clubId')
    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 })
    }

    // Verify access
    if (profile.role !== 'system_admin' && profile.club_id !== clubId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id, stripe_account_id, stripe_connect_status, stripe_onboarding_completed_at')
      .eq('id', clubId)
      .single()

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    // No account connected
    if (!club.stripe_account_id) {
      return NextResponse.json({
        status: 'not_connected',
        chargesEnabled: false,
        payoutsEnabled: false,
        accountId: null,
      })
    }

    // Retrieve from Stripe
    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(club.stripe_account_id)

    // Determine status
    let newStatus: string
    if (account.charges_enabled && account.payouts_enabled) {
      newStatus = 'active'
    } else if (account.details_submitted) {
      newStatus = 'restricted'
    } else {
      newStatus = 'pending'
    }

    // Update DB if status changed
    if (newStatus !== club.stripe_connect_status) {
      const updateData: Record<string, any> = { stripe_connect_status: newStatus }
      if (newStatus === 'active' && !club.stripe_onboarding_completed_at) {
        updateData.stripe_onboarding_completed_at = new Date().toISOString()
      }
      await supabase.from('clubs').update(updateData).eq('id', clubId)
      log.info('Stripe Connect status updated', { clubId, oldStatus: club.stripe_connect_status, newStatus })
    }

    return NextResponse.json({
      status: newStatus,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      accountId: club.stripe_account_id,
    })
  } catch (error) {
    log.error('Stripe Connect status check error', error)
    return NextResponse.json({ error: 'Failed to check Stripe Connect status' }, { status: 500 })
  }
}
