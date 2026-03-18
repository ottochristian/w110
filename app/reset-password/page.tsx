'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Invalid or expired reset link. Please request a new password reset.')
      }
      setCheckingSession(false)
    }
    checkSession()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const leftPanel = (
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
  )

  if (checkingSession) {
    return (
      <div className="min-h-screen flex bg-background relative">
        <div className="pointer-events-none fixed inset-0 z-0">
          <img src="/topo-bg.svg" alt="" className="w-full h-full object-cover opacity-[0.055]" />
        </div>
        {leftPanel}
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            Verifying reset link…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Topo background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <img src="/topo-bg.svg" alt="" className="w-full h-full object-cover opacity-[0.055]" />
      </div>

      {leftPanel}

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link href="/"><img src="/w110-logo-dark.svg" alt="W110" className="h-8 w-auto" /></Link>
          </div>

          {success ? (
            <>
              <h1 className="page-title text-foreground">Password updated</h1>
              <p className="mt-1.5 text-sm text-zinc-500">Your password has been reset successfully.</p>
              <button
                onClick={() => router.push('/login')}
                className="mt-8 w-full rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-foreground font-medium px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
            </>
          ) : error && !loading ? (
            <>
              <h1 className="page-title text-foreground">Link expired</h1>
              <p className="mt-1.5 text-sm text-zinc-500">{error}</p>
              <button
                onClick={() => router.push('/forgot-password')}
                className="mt-8 w-full rounded-lg bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60 transition-colors"
              >
                Request new reset link
              </button>
              <p className="mt-4 text-center text-sm text-zinc-500">
                <Link href="/login" className="text-orange-500 hover:text-orange-400 font-medium inline-flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back to sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="page-title text-foreground">Reset password</h1>
              <p className="mt-1.5 text-sm text-zinc-500">Enter your new password below.</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-300">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-300">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                <Link href="/login" className="text-orange-500 hover:text-orange-400 font-medium inline-flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
