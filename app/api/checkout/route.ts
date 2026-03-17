import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/api-auth'
import { log } from '@/lib/logger'
import { checkRateLimit, RateLimitPresets } from '@/lib/rate-limit'
import { validateRequest, checkoutSchema, ValidationError } from '@/lib/validation'
import Stripe from 'stripe'

// Initialize Stripe only if secret key is available
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  })
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 10 requests per minute per user
    const rateLimitCheck = checkRateLimit(request, RateLimitPresets.CHECKOUT)
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!
    }

    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user, supabase: userSupabase } = authResult

    // Validate input
    let validatedData
    try {
      validatedData = await validateRequest(checkoutSchema, request)
    } catch (error) {
      if (error instanceof ValidationError) {
        log.warn('Checkout validation failed', { errors: error.errors })
        return NextResponse.json(error.toJSON(), { status: 400 })
      }
      throw error
    }

    const { orderId, amount, clubSlug } = validatedData

    // Use admin client to fetch order (since we need to verify ownership via household)
    const supabase = createSupabaseAdminClient()

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, households(id, primary_email)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      log.warn('Order not found', { orderId, error: orderError })
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify user has access to this order's household
    const { data: guardian } = await supabase
      .from('household_guardians')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!guardian || guardian.household_id !== order.household_id) {
      log.warn('User attempted to access order they do not own', {
        userId: user.id,
        orderId,
        orderHouseholdId: order.household_id,
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load club for Stripe Connect details
    const { data: club } = await supabase
      .from('clubs')
      .select('id, stripe_account_id, stripe_connect_status, stripe_application_fee_percent')
      .eq('id', order.club_id)
      .single()

    // Load order items for line-by-line Stripe display
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('description, amount')
      .eq('order_id', orderId)

    // Build Stripe session params
    const stripe = getStripe()

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = orderItems && orderItems.length > 0
      ? orderItems.map((item) => ({
          price_data: {
            currency: 'usd',
            product_data: { name: item.description },
            unit_amount: Math.round(Number(item.amount) * 100),
          },
          quantity: 1,
        }))
      : [{
          price_data: {
            currency: 'usd',
            product_data: { name: `Registration Order #${orderId.slice(0, 8)}` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }]

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: 'payment',
      ui_mode: 'embedded',
      return_url: `${BASE_URL}/clubs/${clubSlug}/parent/checkout/complete?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        order_id: orderId,
        club_slug: clubSlug,
        club_id: order.club_id,
      },
      customer_email: (order.households as any)?.primary_email || undefined,
      invoice_creation: { enabled: true },
    }

    // Add Stripe Connect params if club has active connected account
    if (club?.stripe_account_id && club.stripe_connect_status === 'active') {
      sessionParams.on_behalf_of = club.stripe_account_id
      sessionParams.transfer_data = { destination: club.stripe_account_id }

      const feePercent = club.stripe_application_fee_percent
      if (feePercent && feePercent > 0) {
        sessionParams.application_fee_amount = Math.round(amount * 100 * feePercent / 100)
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Save session ID to order
    await supabase
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', orderId)

    log.info('Embedded checkout session created', {
      orderId,
      sessionId: session.id,
      userId: user.id,
      useConnect: !!(club?.stripe_account_id && club.stripe_connect_status === 'active'),
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    log.error('Checkout error', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
