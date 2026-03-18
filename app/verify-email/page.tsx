'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { OTPInput } from '@/components/ui/otp-input'
import { Mail } from 'lucide-react'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get('email')
  const cleanEmail = emailFromUrl ? emailFromUrl.replace(/\s+/g, '+').toLowerCase() : ''

  const [email, setEmail] = useState(cleanEmail || '')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (emailFromUrl) {
      setEmail(emailFromUrl.replace(/\s+/g, '+').toLowerCase())
    }
  }, [emailFromUrl])

  async function handleVerifyOTP() {
    if (!email || !otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const userResponse = await fetch('/api/auth/get-user-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const userData = await userResponse.json()

      if (!userResponse.ok || !userData.success) {
        setError('No account found for this email address.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.userId, code: otp, type: 'email_verification', contact: email }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid or expired code')
        setAttemptsRemaining(data.attemptsRemaining)
        setLoading(false)
        return
      }

      setSuccess('Email verified! Redirecting to sign in…')
      setTimeout(() => {
        router.push('/login?message=Email verified! Please log in with your credentials.')
      }, 2000)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendCode() {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const userResponse = await fetch('/api/auth/get-user-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const userData = await userResponse.json()

      if (!userResponse.ok || !userData.success) {
        setError('No account found for this email address.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.userId, type: 'email_verification', contact: email, metadata: { firstName: null } }),
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
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Topo background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <img src="/topo-bg.svg" alt="" className="w-full h-full object-cover opacity-[0.055]" />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-zinc-800 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-end justify-start">
          <div className="h-[400px] w-[400px] rounded-full bg-orange-600/10 blur-[100px] -translate-x-1/4 translate-y-1/4" />
        </div>
        <div className="relative">
          <Link href="/"><img src="/w110-logo-dark.svg" alt="W110" className="h-8 w-auto" /></Link>
        </div>
        <div className="relative">
          <p className="text-3xl font-bold text-foreground leading-snug tracking-tight">
            Almost there.<br />
            <span className="text-orange-500">Verify your email.</span>
          </p>
          <p className="mt-4 text-zinc-500 text-sm leading-relaxed max-w-xs">
            We sent a 6-digit code to your inbox. Enter it below to confirm your email and activate your account.
          </p>
        </div>
        <p className="relative text-zinc-700 text-xs">© {new Date().getFullYear()} West 110</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link href="/"><img src="/w110-logo-dark.svg" alt="W110" className="h-8 w-auto" /></Link>
          </div>

          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600/10">
            <Mail className="h-6 w-6 text-orange-500" />
          </div>

          <h1 className="page-title text-foreground">Verify your email</h1>
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
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-60 transition-shadow"
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
            <button
              onClick={handleResendCode}
              disabled={loading}
              className="text-orange-500 hover:text-orange-400 font-medium disabled:opacity-60"
            >
              Resend
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
