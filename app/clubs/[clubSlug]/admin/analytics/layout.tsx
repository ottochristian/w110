'use client'

import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const tabs = [
  { name: 'Overview', href: '/admin/analytics' },
  { name: 'Revenue', href: '/admin/analytics/revenue' },
  { name: 'Athletes', href: '/admin/analytics/athletes' },
  { name: 'Programs', href: '/admin/analytics/programs' },
  { name: 'Waivers', href: '/admin/analytics/waivers' },
]

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const params = useParams()
  const clubSlug = params?.clubSlug as string

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const fullPath = `/clubs/${clubSlug}${tab.href}`
            const isActive = pathname === fullPath
            
            return (
              <Link
                key={tab.name}
                href={fullPath}
                className={cn(
                  'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                )}
              >
                {tab.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
  )
}
