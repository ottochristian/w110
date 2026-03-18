import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/api-auth'
import { log } from '@/lib/logger'
import { notificationService } from '@/lib/services/notification-service'
import Stripe from 'stripe'

async function sendConfirmationEmail(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  orderId: string,
  totalAmount: number,
  registrationIds: string[]
) {
  try {
    const { data: orderDetails } = await supabase
      .from('orders')
      .select(`
        clubs(name),
        households(
          household_guardians(
            is_primary,
            profiles(email, first_name)
          )
        )
      `)
      .eq('id', orderId)
      .single()

    const { data: regDetails } = await supabase
      .from('registrations')
      .select('athletes(first_name, last_name), sub_programs(name, programs(name))')
      .in('id', registrationIds)

    if (!orderDetails || !regDetails) return

    const guardians = (orderDetails as any).households?.household_guardians ?? []
    const primary = guardians.find((g: any) => g.is_primary) ?? guardians[0]
    const guardianEmail = primary?.profiles?.email
    const clubName = (orderDetails as any).clubs?.name ?? 'Your Ski Club'

    if (!guardianEmail) return

    await notificationService.sendRegistrationConfirmation(guardianEmail, {
      firstName: primary?.profiles?.first_name,
      clubName,
      orderId,
      totalAmount,
      registrations: regDetails.map((r: any) => ({
        athleteName: `${r.athletes?.first_name ?? ''} ${r.athletes?.last_name ?? ''}`.trim(),
        programName: r.sub_programs?.programs?.name ?? r.sub_programs?.name ?? 'Program',
        subProgramName: r.sub_programs?.name,
      })),
    })
    log.info('[Verify Payment] Confirmation email sent', { orderId, to: guardianEmail })
  } catch (err) {
    log.warn('[Verify Payment] Failed to send confirmation email', { orderId, error: err instanceof Error ? err.message : String(err) })
  }
}

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  })
}

/**
 * Verify payment status with Stripe and update order if webhook didn't fire.
 * This is a fallback mechanism for when webhooks don't work (local dev, webhook issues).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    log.info('[Verify Payment] Starting verification', { orderId })

    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      log.warn('[Verify Payment] Auth failed', { orderId })
      return authResult
    }

    const { user } = authResult
    log.info('[Verify Payment] User authenticated', { orderId, userId: user.id })

    const supabase = createSupabaseAdminClient()

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total_amount, household_id, club_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify user owns this order
    const { data: guardian } = await supabase
      .from('household_guardians')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!guardian || guardian.household_id !== order.household_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If already paid, return success
    if (order.status === 'paid') {
      log.info('[Verify Payment] Order already paid', { orderId })
      return NextResponse.json({
        success: true,
        status: 'paid',
        message: 'Order already marked as paid',
      })
    }

    log.info('[Verify Payment] Order status:', { orderId, status: order.status })

    // Check if there's a payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, order_id, amount, status, processed_at')
      .eq('order_id', orderId)
      .eq('status', 'succeeded')
      .single()

    log.info('[Verify Payment] Payment record check', {
      orderId,
      found: !!payment,
      error: paymentError?.message,
    })

    if (payment) {
      // Payment exists but order not updated - fix it
      log.info('[Verify Payment] Found successful payment, updating order status', { orderId })

      await supabase
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      // Update registrations
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('registration_id, amount')
        .eq('order_id', orderId)

      if (orderItems && orderItems.length > 0) {
        const updatePromises = orderItems.map((item: any) =>
          supabase
            .from('registrations')
            .update({
              status: 'confirmed',
              payment_status: 'paid',
              amount_paid: item.amount,
            })
            .eq('id', item.registration_id)
        )
        await Promise.all(updatePromises)
        const registrationIds = orderItems.map((i: any) => i.registration_id).filter(Boolean)
        await sendConfirmationEmail(supabase, orderId, order.total_amount, registrationIds)
      }

      return NextResponse.json({
        success: true,
        status: 'paid',
        message: 'Order status updated from payment record',
      })
    }

    // No payment record — check Stripe directly
    log.info('[Verify Payment] Checking Stripe for checkout session', { orderId })

    const stripe = getStripe()

    // Load club for Stripe Connect details
    const { data: club } = await supabase
      .from('clubs')
      .select('stripe_account_id')
      .eq('id', order.club_id)
      .maybeSingle()

    // Build optional Stripe account header for Connect
    const stripeOptions = club?.stripe_account_id
      ? { stripeAccount: club.stripe_account_id }
      : undefined

    // NEW: Look up session directly by stored stripe_session_id
    const { data: orderWithSession } = await supabase
      .from('orders')
      .select('stripe_session_id')
      .eq('id', orderId)
      .single()

    let matchingSession: Stripe.Checkout.Session | null = null

    if (orderWithSession?.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(
        orderWithSession.stripe_session_id,
        undefined,
        stripeOptions
      )
      if (session.payment_status === 'paid') {
        matchingSession = session
      } else {
        log.info('[Verify Payment] Session found but not paid yet', {
          orderId,
          sessionId: session.id,
          paymentStatus: session.payment_status,
        })
        return NextResponse.json({
          success: false,
          status: order.status,
          message: 'Payment not yet complete',
        })
      }
    } else {
      // Only fall back to list if no session ID stored (old orders)
      log.warn('[Verify Payment] No session_id stored, falling back to session list', { orderId })

      const sessions = await stripe.checkout.sessions.list({ limit: 10 })

      log.info('[Verify Payment] Retrieved sessions from Stripe', {
        orderId,
        sessionCount: sessions.data.length,
      })

      matchingSession =
        sessions.data.find(
          (s) => s.metadata?.order_id === orderId && s.payment_status === 'paid'
        ) ?? null

      log.info('[Verify Payment] Session search result', {
        orderId,
        found: !!matchingSession,
        matchingSessionId: matchingSession?.id,
      })
    }

    if (matchingSession) {
      log.info('[Verify Payment] Found paid session in Stripe, processing manually', {
        orderId,
        sessionId: matchingSession.id,
      })

      // CRITICAL: Check one more time for payment by session ID to prevent race condition
      const { data: existingBySession } = await supabase
        .from('payments')
        .select('id')
        .eq('stripe_checkout_session_id', matchingSession.id)
        .maybeSingle()

      if (existingBySession) {
        log.info(
          '[Verify Payment] Payment already exists for this session (race condition avoided)',
          { orderId, sessionId: matchingSession.id, existingPaymentId: existingBySession.id }
        )

        // Still update order status if needed
        await supabase
          .from('orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('status', 'unpaid')

        return NextResponse.json({
          success: true,
          status: 'paid',
          message: 'Payment already recorded',
        })
      }

      // Process it like the webhook would
      await supabase
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      // Create payment record
      const { error: insertError } = await supabase.from('payments').insert([
        {
          order_id: orderId,
          amount: order.total_amount,
          method: 'stripe',
          status: 'succeeded',
          stripe_checkout_session_id: matchingSession.id,
          stripe_payment_intent_id: matchingSession.payment_intent as string,
          processed_at: new Date().toISOString(),
        },
      ])

      if (insertError) {
        // If insert fails due to unique constraint (race condition), that's OK
        if (insertError.code === '23505') {
          log.info(
            '[Verify Payment] Payment insert failed due to unique constraint (race condition prevented)',
            { orderId, sessionId: matchingSession.id }
          )
          return NextResponse.json({
            success: true,
            status: 'paid',
            message: 'Payment already recorded by concurrent request',
          })
        }
        log.error('[Verify Payment] Payment insert error', insertError, { orderId })
      }

      // Update registrations
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('registration_id, amount')
        .eq('order_id', orderId)

      if (orderItems && orderItems.length > 0) {
        const updatePromises = orderItems.map((item: any) =>
          supabase
            .from('registrations')
            .update({
              status: 'confirmed',
              payment_status: 'paid',
              amount_paid: item.amount,
            })
            .eq('id', item.registration_id)
        )
        await Promise.all(updatePromises)
        const registrationIds = orderItems.map((i: any) => i.registration_id).filter(Boolean)
        await sendConfirmationEmail(supabase, orderId, order.total_amount, registrationIds)
      }

      return NextResponse.json({
        success: true,
        status: 'paid',
        message: 'Payment verified with Stripe and order updated',
      })
    }

    // No payment found anywhere
    log.warn('[Verify Payment] No payment found', { orderId })
    return NextResponse.json({
      success: false,
      status: order.status,
      message: 'No successful payment found',
    })
  } catch (error) {
    log.error('[Verify Payment] Error verifying payment', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
