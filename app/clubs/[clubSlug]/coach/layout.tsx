'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireCoach } from '@/lib/auth-context'
import { CoachSidebar } from '@/components/coach-sidebar'
import { UnifiedSeasonSelector } from '@/components/unified-season-selector'
import { ProfileMenu } from '@/components/profile-menu'
import { NotificationBell } from '@/components/notification-bell'
import { useClub } from '@/lib/club-context'
import { SeasonProvider } from '@/lib/contexts/season-context'
import { InlineLoading } from '@/components/ui/loading-states'
import { ErrorBoundary } from '@/components/error-boundary'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { useImpersonation } from '@/lib/use-impersonation'
import { Menu } from 'lucide-react'

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const router = useRouter()
  const { profile, loading: authLoading } = useRequireCoach()
  const { club, loading: clubLoading } = useClub()
  const impCtx = useImpersonation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !clubLoading && club && club.slug !== clubSlug) {
      if (profile?.role === 'system_admin') return
      if (typeof document !== 'undefined' && /(?:^|;\s*)imp=/.test(document.cookie)) return
      router.replace(`/clubs/${club.slug}/coach`)
    }
  }, [club, clubSlug, authLoading, clubLoading, router, profile])

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <SeasonProvider>
      <ImpersonationBanner />
      <div className="flex h-screen">
        <CoachSidebar
          profile={profile}
          clubSlug={clubSlug}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <main className="flex-1 min-w-0 md:ml-64 flex flex-col overflow-hidden">
          <div className={`fixed right-0 left-0 md:left-64 border-b border-orange-800/40 bg-background/80 backdrop-blur-sm px-4 md:px-8 py-3 z-10 ${impCtx ? 'top-11' : 'top-0'}`}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="md:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4 ml-auto">
                {clubLoading ? (
                  <div className="h-10 w-48 bg-zinc-800 animate-pulse rounded" />
                ) : (
                  <>
                    <UnifiedSeasonSelector />
                    <NotificationBell
                      nudgesEndpoint="/api/coach/nudges"
                      draftEndpoint="/api/coach/nudges/draft"
                      clubSlug={clubSlug}
                      composeHref={`/clubs/${clubSlug}/coach/messages/compose`}
                    />
                    <ProfileMenu profile={profile} />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className={`flex-1 overflow-y-auto overflow-x-hidden ${impCtx ? 'pt-28' : 'pt-16'}`}>
            <div className="p-4 md:p-8">
              <ErrorBoundary>
                {clubLoading ? <InlineLoading message="Loading..." /> : children}
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </SeasonProvider>
  )
}
