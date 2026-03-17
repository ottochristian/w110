'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

type PaymentState = 'loading' | 'paid' | 'processing' | 'failed'

export default function CheckoutCompletePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const clubSlug = params.clubSlug as string
  const orderId = searchParams.get('order')

  const [state, setState] = useState<PaymentState>('loading')
  const [attemptCount, setAttemptCount] = useState(0)
  const [supabase] = useState(() => createClient())
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const MAX_ATTEMPTS = 10
  const POLL_INTERVAL_MS = 2000

  async function verifyPayment(): Promise<boolean> {
    if (!orderId) return false

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) return false

      const response = await fetch(`/api/orders/${orderId}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) return false

      const data = await response.json()
      return data.success === true && data.status === 'paid'
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (!orderId) {
      setState('failed')
      return
    }

    // Clear cart on arrival at this page (payment initiated)
    // We use localStorage directly to avoid needing CartContext here
    try {
      localStorage.removeItem('cart_items')
    } catch {
      // Best-effort
    }

    let cancelled = false
    let attempts = 0

    async function poll() {
      if (cancelled) return

      attempts++
      setAttemptCount(attempts)

      const paid = await verifyPayment()

      if (paid) {
        if (!cancelled) setState('paid')
        return
      }

      if (attempts >= MAX_ATTEMPTS) {
        if (!cancelled) setState('failed')
        return
      }

      // Still processing — set state and schedule next poll
      if (!cancelled) setState('processing')
      pollingRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }

    // Start polling
    poll()

    return () => {
      cancelled = true
      if (pollingRef.current) {
        clearTimeout(pollingRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  if (state === 'loading' || (state === 'processing' && attemptCount <= 1)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <h2 className="text-xl font-semibold">Confirming your payment...</h2>
        <p className="text-muted-foreground text-sm">This will only take a moment.</p>
      </div>
    )
  }

  if (state === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <h2 className="text-xl font-semibold">Confirming your payment...</h2>
        <p className="text-muted-foreground text-sm">
          Attempt {attemptCount} of {MAX_ATTEMPTS}. Please wait.
        </p>
      </div>
    )
  }

  if (state === 'paid') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h1 className="text-3xl font-bold text-green-700">Payment Successful!</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Your registration is confirmed. You will receive a confirmation email shortly.
          </p>
        </div>

        <Card className="w-full max-w-sm border-green-200 bg-green-50">
          <CardContent className="pt-6 pb-4 text-center">
            <p className="text-sm text-green-800">
              Order <span className="font-mono font-semibold">#{orderId?.slice(0, 8)}</span> has been processed.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/clubs/${clubSlug}/parent/dashboard`}>
            <Button>Go to Dashboard</Button>
          </Link>
          <Link href={`/clubs/${clubSlug}/parent/programs`}>
            <Button variant="outline">Browse Programs</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Failed state
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
      <div className="flex flex-col items-center gap-3">
        <XCircle className="h-16 w-16 text-red-500" />
        <h1 className="text-3xl font-bold text-red-700">Payment Not Confirmed</h1>
        <p className="text-muted-foreground text-center max-w-md">
          We could not confirm your payment. If you were charged, please contact support. Otherwise,
          you can return to your cart and try again.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={`/clubs/${clubSlug}/parent/cart`}>
          <Button variant="outline">Return to Cart</Button>
        </Link>
        <Link href={`/clubs/${clubSlug}/parent`}>
          <Button variant="ghost">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
