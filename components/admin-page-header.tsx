'use client'

import type React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface AdminPageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  backHref?: string
}

export function AdminPageHeader({ title, description, action, backHref }: AdminPageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {backHref && (
          <Link href={backHref} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
        )}
        <h1 className="page-title">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
