'use client'

import type React from 'react'
import { useState } from 'react'
import { SystemAdminSidebar } from '@/components/system-admin-sidebar'
import { ProfileMenu } from '@/components/profile-menu'
import { useSystemAdmin } from '@/lib/use-system-admin'
import { Menu } from 'lucide-react'

export default function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading, error } = useSystemAdmin()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">{error || 'Access denied'}</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <SystemAdminSidebar
        profile={profile}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <main className="flex-1 min-w-0 md:ml-64 flex flex-col overflow-hidden">
        <div className="fixed top-0 right-0 left-0 md:left-64 border-b border-orange-800/40 bg-background/80 backdrop-blur-sm px-4 md:px-8 py-3 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">System Administration</h1>
            <div className="ml-auto">
              {profile && <ProfileMenu profile={profile} />}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-16">
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
