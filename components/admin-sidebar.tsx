'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Profile } from '@/lib/types'
import { LayoutDashboard, BookOpen, FileText, Users, Settings, BarChart3 } from 'lucide-react'
import { useClub } from '@/lib/club-context'

interface AdminSidebarProps {
  profile: Profile
  clubSlug?: string
}

export function AdminSidebar({ profile, clubSlug }: AdminSidebarProps) {
  const pathname = usePathname()
  const { club, loading: clubLoading } = useClub()
  const [logoError, setLogoError] = useState(false)

  const basePath = clubSlug ? `/clubs/${clubSlug}/admin` : '/admin'

  const menuItems = [
    { label: 'Dashboard', href: `${basePath}`, icon: LayoutDashboard },
    { label: 'Analytics', href: `${basePath}/analytics`, icon: BarChart3 },
    { label: 'Programs', href: `${basePath}/programs`, icon: BookOpen },
    { label: 'Registrations', href: `${basePath}/registrations`, icon: FileText },
    { label: 'Athletes', href: `${basePath}/athletes`, icon: Users },
    { label: 'Coaches', href: `${basePath}/coaches`, icon: Users },
    { label: 'Settings', href: `${basePath}/settings`, icon: Settings },
  ]

  const initial = club?.name?.charAt(0).toUpperCase() || 'S'

  return (
    <aside className="w-64 bg-zinc-950 flex flex-col h-screen fixed left-0 top-0">
      {/* Header — club identity */}
      <div className="px-5 py-5 flex-shrink-0 border-b border-zinc-800">
        {/* Ski Admin brand */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold leading-none">S</span>
          </div>
          <span className="text-zinc-500 text-xs font-medium tracking-wide uppercase">Ski Admin</span>
        </div>

        {/* Club logo + name */}
        {club && !clubLoading ? (
          <div className="flex items-center gap-3">
            {club.logo_url && !logoError ? (
              <img
                src={club.logo_url}
                alt={club.name}
                className="w-9 h-9 rounded-lg object-cover flex-shrink-0 ring-1 ring-zinc-700"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-zinc-700 text-sm font-semibold text-white"
                style={{ backgroundColor: club.primary_color || '#3B82F6' }}
              >
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{club.name}</p>
              <p className="text-zinc-500 text-xs truncate">{profile.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-zinc-500 text-xs truncate">{profile.email}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== basePath && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white font-medium'
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
        <p className="text-zinc-600 text-xs">Admin Portal</p>
      </div>
    </aside>
  )
}
