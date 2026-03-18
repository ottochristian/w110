'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useParentClub } from '@/lib/use-parent-club'
import { useCurrentSeason } from '@/lib/contexts/season-context'
import { useOrdersByHousehold } from '@/lib/hooks/use-orders'
import { createClient } from '@/lib/supabase/client'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InlineLoading } from '@/components/ui/loading-states'
import { CheckCircle2, Clock, Lock } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Order = {
  id: string
  total_amount: number
  status: string
  created_at: string
  order_items: Array<{ description: string; amount: number }>
  payments: Array<{ amount: number; status: string }>
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-950/30 border border-green-800/40 px-2.5 py-1 text-xs font-medium text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    )
  }
  if (status === 'partially_paid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-950/30 border border-yellow-800/40 px-2.5 py-1 text-xs font-medium text-yellow-400">
        <Clock className="h-3 w-3" /> Partial
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-950/30 border border-red-800/40 px-2.5 py-1 text-xs font-medium text-red-400">
      Unpaid
    </span>
  )
}

export default function BillingPage() {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const [supabase] = useState(() => createClient())

  const { household, loading: authLoading } = useParentClub()
  const currentSeason = useCurrentSeason()

  const { data: orders = [], isLoading: ordersLoading, error: ordersError, refetch } =
    useOrdersByHousehold(household?.id || null, currentSeason?.id)

  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null)
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)

  async function handlePayNow(order: Order) {
    setPayingOrderId(order.id)
    setPayError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Session expired. Please log in again.')

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id, amount: order.total_amount, clubSlug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start payment')
      setCheckoutSecret(data.clientSecret)
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to start payment')
      setPayingOrderId(null)
    }
  }

  // ── Embedded checkout view ─────────────────────────────────────────────────
  if (checkoutSecret) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <button
            type="button"
            onClick={() => { setCheckoutSecret(null); setPayingOrderId(null); refetch() }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Billing
          </button>
        </div>
        <h1 className="page-title">Complete Payment</h1>
        <p className="text-sm text-muted-foreground">Secure checkout powered by Stripe</p>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: checkoutSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    )
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (authLoading || ordersLoading) return <InlineLoading />

  if (ordersError) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="page-title">Billing</h1>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-red-400 mb-4">{ordersError.message}</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Billing</h1>
        <p className="text-muted-foreground">Your orders for {currentSeason?.name}</p>
      </div>

      {payError && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {payError}
        </div>
      )}

      {(() => {
        const visibleOrders = (orders as Order[]).filter(
          (o) => o.status === 'paid' || o.status === 'partially_paid'
        )
        if (visibleOrders.length === 0) return (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No payments yet this season.</p>
            </CardContent>
          </Card>
        )
        return (
        <div className="flex flex-col gap-4">
          {visibleOrders.map((order) => {
            const totalPaid = order.payments
              .filter((p) => p.status === 'succeeded')
              .reduce((sum, p) => sum + Number(p.amount), 0)
            const isPaid = order.status === 'paid'
            const isPartial = order.status === 'partially_paid'
            const remaining = Number(order.total_amount) - totalPaid

            return (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Line items */}
                  <div className="space-y-1.5">
                    {order.order_items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.description}</span>
                        <span className="font-medium">${Number(item.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between border-t pt-3 font-semibold">
                    <span>Total</span>
                    <span>${Number(order.total_amount).toFixed(2)}</span>
                  </div>

                  {/* Amount paid (if partial) */}
                  {isPartial && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Paid so far</span>
                      <span>${totalPaid.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Pay button */}
                  {!isPaid && (
                    <Button
                      className="w-full gap-2 bg-green-600 hover:bg-green-700 text-foreground"
                      onClick={() => handlePayNow(order)}
                      disabled={payingOrderId === order.id}
                    >
                      <Lock className="h-4 w-4" />
                      {payingOrderId === order.id
                        ? 'Loading…'
                        : isPartial
                        ? `Pay Remaining $${remaining.toFixed(2)}`
                        : `Pay $${Number(order.total_amount).toFixed(2)}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        )
      })()}
    </div>
  )
}
