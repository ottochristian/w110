'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRequireAdmin } from '@/lib/auth-context'
import { InlineLoading } from '@/components/ui/loading-states'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CheckCircle, AlertTriangle, Clock, CreditCard, ExternalLink, RefreshCw } from 'lucide-react'

type ConnectStatus = 'not_connected' | 'pending' | 'active' | 'restricted'

interface ConnectStatusData {
  status: ConnectStatus
  chargesEnabled: boolean
  payoutsEnabled: boolean
  accountId: string | null
}

interface ClubData {
  id: string
  stripe_connect_status: ConnectStatus | null
  stripe_application_fee_percent: number | null
}

export default function PaymentsSettingsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const clubSlug = params.clubSlug as string
  const { profile, loading: authLoading } = useRequireAdmin()

  const [supabase] = useState(() => createClient())
  const [club, setClub] = useState<ClubData | null>(null)
  const [connectStatus, setConnectStatus] = useState<ConnectStatusData | null>(null)
  const [loadingClub, setLoadingClub] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load club data
  useEffect(() => {
    if (!profile) return

    async function loadClub() {
      try {
        const { data } = await supabase
          .from('clubs')
          .select('id, stripe_connect_status, stripe_application_fee_percent')
          .eq('slug', clubSlug)
          .single()

        setClub(data)

        // If club has a connect status, also fetch live status from API
        if (data?.id) {
          await checkStatus(data.id)
        }
      } catch (err) {
        setError('Failed to load club data')
      } finally {
        setLoadingClub(false)
      }
    }

    loadClub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, clubSlug])

  // Handle stripe return/refresh from onboarding
  useEffect(() => {
    const stripeParam = searchParams.get('stripe')
    if (stripeParam === 'return' && club?.id) {
      // Came back from Stripe — check status
      checkStatus(club.id)
    } else if (stripeParam === 'refresh' && club?.id) {
      // Stripe asked us to refresh the link — do nothing, user can click "Complete Setup"
      setSuccessMessage('Please click "Complete Setup" to continue the Stripe onboarding.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, club?.id])

  async function getAuthToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  async function checkStatus(clubId: string) {
    setLoadingStatus(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/stripe/connect/status?clubId=${clubId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check status')
      }
      const data: ConnectStatusData = await response.json()
      setConnectStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check Stripe status')
    } finally {
      setLoadingStatus(false)
    }
  }

  async function handleConnect() {
    if (!club) return
    setActionLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/admin/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ clubId: club.id }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to connect Stripe')
      }
      const { onboardingUrl } = await response.json()
      window.location.href = onboardingUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Stripe account')
      setActionLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!club) return
    setActionLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/admin/stripe/connect/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ clubId: club.id }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect Stripe')
      }
      setConnectStatus({ status: 'not_connected', chargesEnabled: false, payoutsEnabled: false, accountId: null })
      setSuccessMessage('Stripe account disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Stripe account')
    } finally {
      setActionLoading(false)
    }
  }

  if (authLoading || loadingClub) {
    return <InlineLoading message="Loading payment settings..." />
  }

  if (!profile) return null

  const currentStatus: ConnectStatus = connectStatus?.status ?? club?.stripe_connect_status ?? 'not_connected'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Payments & Billing</h1>
        <p className="text-muted-foreground">
          Connect your Stripe account to accept registration payments from parents
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-950/20 border border-border rounded-md p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-950/30 border border-border rounded-md p-4">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Stripe Connect Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Connect
              </CardTitle>
              <CardDescription>
                Connect your Stripe account to receive payments directly from parents
              </CardDescription>
            </div>
            {/* Status badge */}
            {currentStatus === 'active' && (
              <Badge className="bg-green-950/30 text-green-400 border-green-900/50">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
            {currentStatus === 'pending' && (
              <Badge className="bg-yellow-950/30 text-yellow-400 border-yellow-900/50">
                <Clock className="h-3 w-3 mr-1" />
                Onboarding in Progress
              </Badge>
            )}
            {currentStatus === 'restricted' && (
              <Badge className="bg-orange-950/30 text-orange-400 border-orange-900/50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Action Required
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* NOT CONNECTED */}
          {currentStatus === 'not_connected' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Stripe account so parents can pay directly to your club. Stripe handles
                all card processing securely.
              </p>
              <Button onClick={handleConnect} disabled={actionLoading}>
                {actionLoading ? 'Redirecting to Stripe...' : 'Connect Stripe Account'}
              </Button>
            </div>
          )}

          {/* PENDING */}
          {currentStatus === 'pending' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your Stripe onboarding is in progress. Complete all steps in Stripe to start
                accepting payments.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button onClick={handleConnect} disabled={actionLoading}>
                  {actionLoading ? 'Loading...' : 'Complete Setup'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => club && checkStatus(club.id)}
                  disabled={loadingStatus}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingStatus ? 'animate-spin' : ''}`} />
                  Check Status
                </Button>
              </div>
            </div>
          )}

          {/* ACTIVE */}
          {currentStatus === 'active' && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1 border-b">
                  <span className="text-muted-foreground">Account ID</span>
                  <span className="font-mono text-xs">
                    {connectStatus?.accountId
                      ? `${connectStatus.accountId.slice(0, 8)}...`
                      : 'Connected'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b">
                  <span className="text-muted-foreground">Charges</span>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Enabled
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Payouts</span>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Enabled
                  </Badge>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    Stripe Dashboard
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </a>
                <Button
                  variant="outline"
                  onClick={() => club && checkStatus(club.id)}
                  disabled={loadingStatus}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingStatus ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-400 border-red-900/50 hover:bg-red-950/20">
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Stripe Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the Stripe connection from your club. Parents will not be
                        able to make payments until you reconnect. This does not delete your Stripe
                        account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDisconnect}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* RESTRICTED */}
          {currentStatus === 'restricted' && (
            <div className="space-y-4">
              <p className="text-sm text-orange-700">
                Your Stripe account requires additional verification before payments can be processed.
                Click below to complete the required steps.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button onClick={handleConnect} disabled={actionLoading}>
                  {actionLoading ? 'Loading...' : 'Complete Verification'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => club && checkStatus(club.id)}
                  disabled={loadingStatus}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingStatus ? 'animate-spin' : ''}`} />
                  Check Status
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Settings card — only shown when connected */}
      {currentStatus === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Fee</CardTitle>
            <CardDescription>
              Platform fee applied to each transaction (set by system administrator)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Application fee</span>
              <span className="font-semibold">
                {club?.stripe_application_fee_percent != null
                  ? `${club.stripe_application_fee_percent}%`
                  : 'Not set'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Contact your system administrator to adjust the platform fee for your club.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
