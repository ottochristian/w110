'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const sessionCheckRef = useRef(false) // Prevent duplicate session checks

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const msg = urlParams.get('message')
      const confirmed = urlParams.get('confirmed')
      if (msg) {
        setMessage(decodeURIComponent(msg))
      }
      if (confirmed === 'true') {
        setMessage('Email confirmed! You can now log in.')
      }
    }
  }, [])

  // Check if user is already logged in and redirect appropriately
  useEffect(() => {
    async function checkUserAndRedirect() {
      // Prevent duplicate calls (React 18 strict mode runs useEffect twice)
      if (sessionCheckRef.current) {
        console.log('[LOGIN] Session check already running, skipping duplicate')
        return
      }
      sessionCheckRef.current = true
      
      try {
        // Check for redirect parameter
        const urlParams = new URLSearchParams(window.location.search)
        const redirectTo = urlParams.get('redirect')

        // Add timeout to prevent hanging (10s to match auth context)
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 10000)
        )
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any

        
        if (!session) {
          setCheckingSession(false)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setCheckingSession(false)
          return
        }

        // If there's a redirect parameter, use it (for invitation acceptance, etc.)
        if (redirectTo) {
          router.push(redirectTo)
          return
        }

        // Get user profile for role and club info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, club_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profileData) {
          setCheckingSession(false)
          return
        }

        // Redirect based on role
        if (profileData.role === 'system_admin') {
          router.push('/system-admin')
          return
        }

        let clubIdToUse = profileData.club_id

        // Parent: reconcile club_id with household club (if mismatch)
        if (profileData.role === 'parent') {
          const { data: householdGuardian, error: householdError } = await supabase
            .from('household_guardians')
            .select('household_id, households!inner(club_id)')
            .eq('user_id', user.id)
            .maybeSingle()

          const householdClubId = Array.isArray((householdGuardian as any)?.households)
            ? (householdGuardian as any)?.households?.[0]?.club_id
            : (householdGuardian as any)?.households?.club_id

          if (householdClubId && householdClubId !== clubIdToUse) {
            clubIdToUse = householdClubId
            // Attempt to fix profile club_id to match household
            const { error: profileUpdateError } = await supabase
              .from('profiles')
              .update({ club_id: householdClubId })
              .eq('id', user.id)

          }
        }

        if (profileData.role === 'admin' && clubIdToUse) {
          const resp = await fetch(`/api/clubs/public?id=${encodeURIComponent(clubIdToUse)}`)
          const json = await resp.json()

          if (resp.ok && json?.club?.slug) {
            router.push(`/clubs/${json.club.slug}/admin`)
            return
          }
        }

        if (profileData.role === 'coach') {
          router.push('/coach')
          return
        }

        if (profileData.role === 'parent' && clubIdToUse) {
          const resp = await fetch(`/api/clubs/public?id=${encodeURIComponent(clubIdToUse)}`)
          const json = await resp.json()

          if (resp.ok && json?.club?.slug) {
            router.push(`/clubs/${json.club.slug}/parent/dashboard`)
            return
          }
        }

        setCheckingSession(false)
      } catch (error) {
        console.error('Session check error:', error)
        setCheckingSession(false)
      } finally {
        // Reset the ref so it can run again if needed
        sessionCheckRef.current = false
      }
    }

    checkUserAndRedirect()
  }, [router, supabase])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Login failed. Please try again.')
        setLoading(false)
        return
      }

      // Check for redirect parameter (for invitation acceptance, etc.)
      const urlParams = new URLSearchParams(window.location.search)
      const redirectTo = urlParams.get('redirect')
      
      if (redirectTo) {
        router.push(redirectTo)
        return
      }

      // Get user profile for role-based redirect
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, club_id')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profileData) {
        setError('Could not load user profile. Please try again.')
        setLoading(false)
        return
      }

      // Redirect based on role
      if (profileData.role === 'system_admin') {
        router.push('/system-admin')
        return
      }

      let clubIdToUse = profileData.club_id

      // Parent: reconcile club_id with household club (if mismatch)
      if (profileData.role === 'parent') {
        const { data: householdGuardian, error: householdError } = await supabase
          .from('household_guardians')
          .select('household_id, households!inner(club_id)')
          .eq('user_id', authData.user.id)
          .maybeSingle()

        const householdClubId = Array.isArray((householdGuardian as any)?.households)
          ? (householdGuardian as any)?.households?.[0]?.club_id
          : (householdGuardian as any)?.households?.club_id

        if (householdClubId && householdClubId !== clubIdToUse) {
          clubIdToUse = householdClubId
          // Attempt to fix profile club_id to match household
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ club_id: householdClubId })
            .eq('id', authData.user.id)

        }
      }

      if (profileData.role === 'admin' && clubIdToUse) {
        const resp = await fetch(`/api/clubs/public?id=${encodeURIComponent(clubIdToUse)}`)
        const json = await resp.json()

        if (resp.ok && json?.club?.slug) {
          router.push(`/clubs/${json.club.slug}/admin`)
        } else {
          router.push('/admin')
        }
        return
      }

      if (profileData.role === 'coach') {
        router.push('/coach')
        return
      }

      if (profileData.role === 'parent' && clubIdToUse) {
        const resp = await fetch(`/api/clubs/public?id=${encodeURIComponent(clubIdToUse)}`)
        const json = await resp.json()

        if (resp.ok && json?.club?.slug) {
          router.push(`/clubs/${json.club.slug}/parent/dashboard`)
        } else {
          setError('Club not found. Please contact support.')
          setLoading(false)
        }
        return
      }

      // Unknown role
      setError('Unknown user role. Please contact support.')
      setLoading(false)
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 text-sm">Checking your session…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold leading-none">S</span>
          </div>
          <span className="text-white text-sm font-semibold tracking-tight">Ski Admin</span>
        </div>

        <div>
          <p className="text-2xl font-semibold text-white leading-snug">
            Everything your ski club needs,<br />
            in one place.
          </p>
          <p className="mt-3 text-zinc-500 text-sm leading-relaxed max-w-xs">
            Registrations, athlete management, waivers, payments, and reporting — built for the way clubs actually operate.
          </p>
        </div>

        <p className="text-zinc-700 text-xs">© {new Date().getFullYear()} Ski Admin</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold leading-none">S</span>
            </div>
            <span className="text-zinc-900 text-sm font-semibold tracking-tight">Ski Admin</span>
          </div>

          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Sign in to your account to continue.</p>

          {message && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
