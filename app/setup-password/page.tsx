'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { OTPInput } from '@/components/ui/otp-input'
import { Key, AlertCircle } from 'lucide-react'

interface TokenUser {
  id: string
  email: string
  type: string
  clubId?: string
  role: string
}

function SetupPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token')

  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [user, setUser] = useState<TokenUser | null>(null)

  const [step, setStep] = useState<'verify' | 'password'>('verify')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)

  useEffect(() => {
    async function validateSetupToken() {
      if (!tokenFromUrl) {
        setTokenError('No setup token provided. Please use the link from your invitation email.')
        setValidatingToken(false)
        return
      }

      try {
        const response = await fetch('/api/auth/verify-setup-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenFromUrl }),
        })
        const data = await response.json()

        if (!response.ok || !data.success) {
          setTokenError(data.error || 'Invalid or expired setup link')
          setValidatingToken(false)
          return
        }

        setUser(data.user)
        setTokenValid(true)
        setValidatingToken(false)
      } catch {
        setTokenError('Failed to validate setup link. Please try again.')
        setValidatingToken(false)
      }
    }

    validateSetupToken()
  }, [tokenFromUrl])

  async function handleVerifyOTP() {
    if (!user || !otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, code: otp, type: 'admin_invitation', contact: user.email }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid or expired code')
        setAttemptsRemaining(data.attemptsRemaining)
        setLoading(false)
        return
      }

      setSuccess('Code verified! Setting up your password…')
      setTimeout(() => { setStep('password'); setSuccess(null) }, 1500)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()

    if (!user) { setError('Session expired. Please request a new invitation.'); return }
    if (password.length < 12) { setError('Password must be at least 12 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/setup-password-secure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, password, token: tokenFromUrl }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to set password. Please try again.')
        setLoading(false)
        return
      }

      setSuccess('Password set! Redirecting to sign in…')
      setTimeout(() => router.push('/login?message=Account setup complete! Please log in.'), 2000)
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  async function handleResendCode() {
    if (!user) { setError('Session expired'); return }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'admin_invitation',
          contact: user.email,
          metadata: { firstName: null, clubName: 'W110', setupLink: `${window.location.origin}/setup-password?token=${tokenFromUrl}` },
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to resend code')
        setLoading(false)
        return
      }

      setSuccess('New code sent! Check your email.')
      setOtp('')
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const layout = (children: React.ReactNode) => (
    <div className="min-h-screen flex bg-background relative">
      <div className="pointer-events-none fixed inset-0 z-0">
        <img src="/topo-bg.svg" alt="" className="w-full h-full object-cover opacity-[0.055]" />
      </div>
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-zinc-800 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-end justify-start">
          <div className="h-[400px] w-[400px] rounded-full bg-orange-600/10 blur-[100px] -translate-x-1/4 translate-y-1/4" />
        </div>
        <div className="relative">
          <Link href="/"><img src="/w110-logo-dark.svg" alt="W110" className="h-8 w-auto" /></Link>
        </div>
        <div className="relative">
          <p className="text-3xl font-bold text-foreground leading-snug tracking-tight">
            Run your club.<br />
            <span className="text-orange-500">Not spreadsheets.</span>
          </p>
          <p className="mt-4 text-zinc-500 text-sm leading-relaxed max-w-xs">
            Registrations, athlete management, waivers, payments, and AI-powered coaching tools — built for the way clubs actually operate.
          </p>
        </div>
        <p className="relative text-zinc-700 text-xs">© {new Date().getFullYear()} West 110</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link href="/"><img src="/w110-logo-dark.svg" alt="W110" className="h-8 w-auto" /></Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  )

  if (validatingToken) {
    return layout(
      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        Validating setup link…
      </div>
    )
  }

  if (!tokenValid || tokenError) {
    return layout(
      <>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <h1 className="page-title text-foreground">Invalid setup link</h1>
        <p className="mt-1.5 text-sm text-zinc-500">{tokenError || 'This setup link is invalid or has expired.'}</p>
        <ul className="mt-4 space-y-1 text-sm text-zinc-600 list-disc pl-4">
          <li>The link has expired (valid for 48 hours)</li>
          <li>The link has already been used</li>
          <li>The link is malformed or incomplete</li>
          <li>Your account setup is already complete</li>
        </ul>
        <button
          onClick={() => router.push('/login')}
          className="mt-8 w-full rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-foreground px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Go to sign in
        </button>
        <p className="mt-3 text-center text-xs text-zinc-600">Need a new invitation? Contact your administrator.</p>
      </>
    )
  }

  if (step === 'verify') {
    return layout(
      <>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600/10">
          <Key className="h-6 w-6 text-orange-500" />
        </div>
        <h1 className="page-title text-foreground">Verify your invitation</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Enter the 6-digit code sent to your email.</p>

        {error && (
          <div className="mt-5 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {error}
            {attemptsRemaining !== null && (
              <span className="block mt-1">{attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining</span>
            )}
          </div>
        )}
        {success && (
          <div className="mt-5 rounded-lg border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        <div className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-400 transition-shadow"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Verification code</label>
            <OTPInput value={otp} onChange={setOtp} disabled={loading} />
            <p className="text-xs text-zinc-500 text-center">Enter the 6-digit code from your email</p>
          </div>
          <button
            onClick={handleVerifyOTP}
            disabled={loading || otp.length !== 6}
            className="w-full rounded-lg bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60 transition-colors"
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Didn't receive the code?{' '}
          <button onClick={handleResendCode} disabled={loading} className="text-orange-500 hover:text-orange-400 font-medium disabled:opacity-60">
            Resend
          </button>
        </p>
      </>
    )
  }

  return layout(
    <>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600/10">
        <Key className="h-6 w-6 text-orange-500" />
      </div>
      <h1 className="page-title text-foreground">Set your password</h1>
      <p className="mt-1.5 text-sm text-zinc-500">Create a secure password for your account.</p>

      {error && (
        <div className="mt-5 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-5 rounded-lg border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      <form onSubmit={handleSetPassword} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 12 characters"
            disabled={loading}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-60 transition-shadow"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-60 transition-shadow"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="w-full rounded-lg bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60 transition-colors"
        >
          {loading ? 'Setting password…' : 'Set password'}
        </button>
      </form>
    </>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    }>
      <SetupPasswordContent />
    </Suspense>
  )
}
