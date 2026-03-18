'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronLeft } from 'lucide-react'
import { ClubPicker } from '@/components/club-picker'

type Club = { id: string; name: string; slug: string }

const STEPS = ['About you', 'Your club']

export default function CompleteProfilePage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [step, setStep] = useState(1)

  // Form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedClubId, setSelectedClubId] = useState('')

  // Data
  const [clubs, setClubs] = useState<Club[]>([])
  const [userEmail, setUserEmail] = useState('')

  // UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Verify user is signed in and pre-fill from Google metadata
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login')
        return
      }

      setUserEmail(user.email ?? '')

      // Pre-fill from Google (or any OAuth) user metadata
      const meta = user.user_metadata ?? {}
      if (meta.given_name) setFirstName(meta.given_name)
      else if (meta.full_name) setFirstName(meta.full_name.split(' ')[0] ?? '')

      if (meta.family_name) setLastName(meta.family_name)
      else if (meta.full_name) {
        const parts = meta.full_name.split(' ')
        if (parts.length > 1) setLastName(parts.slice(1).join(' '))
      }

      setCheckingAuth(false)
    })
  }, [supabase, router])

  // Load clubs
  useEffect(() => {
    fetch('/api/clubs/public')
      .then(r => r.json())
      .then(j => setClubs(j?.clubs ?? []))
      .catch(console.error)
  }, [])

  function goNext() { setError(null); setStep(2) }
  function goBack() { setError(null); setStep(1) }

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const resp = await fetch('/api/auth/complete-google-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, phone: phone || null, clubId: selectedClubId }),
    })
    const data = await resp.json()

    if (!resp.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    const slug = data.clubSlug
    router.push(slug ? `/clubs/${slug}/parent/dashboard` : '/login')
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[360px] flex-shrink-0 bg-zinc-950 flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <img src="/w110-logo-dark.svg" alt="W110" className="h-5 w-auto" />
        </div>

        <div>
          <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-medium mb-7">Complete your profile</p>
          <div className="space-y-5">
            {STEPS.map((label, i) => {
              const n = i + 1
              const done = step > n
              const active = step === n
              return (
                <div key={n} className="flex items-center gap-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-colors
                    ${done ? 'bg-blue-600 text-foreground' : active ? 'bg-foreground text-background' : 'bg-zinc-800 text-zinc-500'}`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : n}
                  </div>
                  <span className={`text-sm transition-colors ${active ? 'text-foreground font-medium' : done ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-zinc-700 text-xs">© {new Date().getFullYear()} W110</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-foreground text-xs font-bold leading-none">S</span>
            </div>
            <span className="text-foreground text-sm font-semibold tracking-tight">Ski Admin</span>
          </div>

          {/* Mobile progress */}
          <div className="flex gap-1.5 mb-8 lg:hidden">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full flex-1 transition-colors ${step > i ? 'bg-blue-600' : 'bg-zinc-200'}`} />
            ))}
          </div>

          {step > 1 && (
            <button type="button" onClick={goBack}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600 mb-6 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}

          {/* ══════════════ STEP 1: About you ══════════════ */}
          {step === 1 && (
            <div>
              <h1 className="page-title text-foreground">Welcome!</h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                Just a couple of details to finish setting up your account
                {userEmail ? ` for ${userEmail}` : ''}.
              </p>

              <div className="mt-8 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">First name</label>
                    <input type="text" value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full rounded-lg border border-zinc-300 bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">Last name</label>
                    <input type="text" value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full rounded-lg border border-zinc-300 bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Phone <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input type="tel" value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full rounded-lg border border-zinc-300 bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
                </div>
              </div>

              {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <button type="button"
                onClick={() => {
                  if (!firstName.trim() || !lastName.trim()) return setError('First and last name are required.')
                  goNext()
                }}
                className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                Continue
              </button>
            </div>
          )}

          {/* ══════════════ STEP 2: Club ══════════════ */}
          {step === 2 && (
            <div>
              <h1 className="page-title text-foreground">Your club</h1>
              <p className="mt-1.5 text-sm text-zinc-500">Select the club you're registering with.</p>

              <div className="mt-8">
                {clubs.length === 0
                  ? <p className="text-sm text-zinc-400">Loading clubs…</p>
                  : <ClubPicker clubs={clubs} value={selectedClubId} onChange={setSelectedClubId} />
                }
              {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <button type="button"
                onClick={() => {
                  if (!selectedClubId) return setError('Please select a club to continue.')
                  handleSubmit()
                }}
                disabled={loading}
                className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 transition-colors">
                {loading ? 'Setting up your account…' : "Let's go"}
              </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
