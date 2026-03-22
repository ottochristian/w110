'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Profile } from '@/lib/types'
import { LayoutDashboard, Building2, Users, UserCog, CreditCard, Activity, Inbox, X } from 'lucide-react'

interface SystemAdminSidebarProps {
  profile: Profile
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function SystemAdminSidebar({ profile, mobileOpen = false, onMobileClose }: SystemAdminSidebarProps) {
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => {
    onMobileClose?.()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const menuItems = [
    { label: 'Dashboard', href: '/system-admin', icon: LayoutDashboard },
    { label: 'Monitoring', href: '/system-admin/monitoring', icon: Activity },
    { label: 'Club Requests', href: '/system-admin/club-requests', icon: Inbox },
    { label: 'Clubs', href: '/system-admin/clubs', icon: Building2 },
    { label: 'Club Admins', href: '/system-admin/admins', icon: Users },
    { label: 'All Users', href: '/system-admin/users', icon: UserCog },
    { label: 'Subscriptions', href: '/system-admin/subscriptions', icon: CreditCard },
  ]

  const navContent = (
    <>
      {/* Header */}
      <div className="px-5 py-5 flex-shrink-0 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <img src="/w110-logo-dark.svg" alt="W110" className="h-6 w-auto" />
        </div>
        <p className="text-zinc-400 text-xs mt-3 font-medium">System Administration</p>
        <p className="text-zinc-600 text-xs mt-0.5 truncate">{profile.email}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/system-admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-foreground font-medium'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-zinc-800">
        <p className="text-zinc-600 text-xs">System Admin Portal</p>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex w-64 bg-zinc-950 flex-col h-screen fixed left-0 top-0">
        {navContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={onMobileClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-72 bg-zinc-950 flex flex-col shadow-2xl border-r border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onMobileClose}
              className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
