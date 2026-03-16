'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Users, Calendar, MessageSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin-page-header'

type Profile = {
  id: string
  email: string
  first_name?: string | null
  role: string
}

type Coach = {
  id: string
  profile_id: string
}

type CoachAssignment = {
  id: string
  role?: string | null
  programs?: { name?: string | null } | null
  sub_programs?: { name?: string | null } | null
  groups?: { name?: string | null } | null
}

const getRoleLabel = (role?: string | null): string => {
  switch (role) {
    case 'head_coach':      return 'Head Coach'
    case 'assistant_coach': return 'Assistant Coach'
    case 'substitute_coach': return 'Substitute Coach'
    default:                return 'Coach'
  }
}

const getAssignmentDisplayName = (a: CoachAssignment): string =>
  a.groups?.name || a.sub_programs?.name || a.programs?.name || 'Unknown'

export default function CoachDashboardPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<CoachAssignment[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { router.push('/login'); return }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (profileError || !profileData || profileData.role !== 'coach') {
        router.push('/login'); return
      }
      setProfile(profileData as Profile)

      const { data: coachData } = await supabase
        .from('coaches').select('*').eq('profile_id', user.id).single()

      if (coachData?.id) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('coach_assignments')
          .select('id, role, programs(name), sub_programs(name), groups(name)')
          .eq('coach_id', coachData.id)

        if (!assignmentsError) {
          setAssignments((assignmentsData || []) as CoachAssignment[])
        }
      }

      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-zinc-400">Loading…</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900 mb-1">Something went wrong</p>
          <p className="text-sm text-zinc-500 mb-4">{error}</p>
          <Button size="sm" asChild><Link href="/coach">Reload</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Coach Dashboard"
        description={`Welcome, ${profile.first_name || profile.email}`}
      />

      <div className="grid gap-5 md:grid-cols-3">
        {/* Navigation */}
        <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-50">
            <h3 className="text-sm font-semibold text-zinc-900">Navigation</h3>
          </div>
          <nav className="p-2">
            {[
              { href: '/coach/athletes', icon: Users, label: 'View Athletes', sub: 'Your assigned athletes' },
              { href: '/coach/races', icon: Calendar, label: 'Manage Races', sub: 'Register athletes for races' },
              { href: '/coach/messages', icon: MessageSquare, label: 'Messages', sub: 'Communicate with families' },
            ].map(({ href, icon: Icon, label, sub }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-zinc-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-100 transition-colors">
                    <Icon className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{label}</p>
                    <p className="text-xs text-zinc-400">{sub}</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
              </Link>
            ))}
          </nav>
        </div>

        {/* Assignments */}
        <div className="md:col-span-2 rounded-xl border border-zinc-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-50">
            <h3 className="text-sm font-semibold text-zinc-900">Your Assignments</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Programs and groups you're coaching</p>
          </div>

          {assignments.length > 0 ? (
            <div className="divide-y divide-zinc-50">
              {assignments.map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/60 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{getAssignmentDisplayName(assignment)}</p>
                    {assignment.role && (
                      <p className="text-xs text-zinc-400 mt-0.5">{getRoleLabel(assignment.role)}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/coach/assignments/${assignment.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-zinc-400">No assignments yet</p>
              <p className="text-xs text-zinc-300 mt-1">Contact an administrator to get assigned to a program</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
