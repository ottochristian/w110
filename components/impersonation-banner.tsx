'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, X } from 'lucide-react'
import { IMP_COOKIE, ImpersonationContext } from '@/lib/impersonation'

export function ImpersonationBanner() {
  const router = useRouter()
  const [ctx, setCtx] = useState<ImpersonationContext | null>(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    function read() {
      const match = document.cookie.match(/(?:^|;\s*)imp=([^;]*)/)
      if (!match) { setCtx(null); return }
      try {
        setCtx(JSON.parse(decodeURIComponent(match[1])))
      } catch {
        setCtx(null)
      }
    }
    read()
  }, [])

  if (!ctx) return null

  async function handleExit() {
    setExiting(true)
    await fetch('/api/system-admin/impersonate', { method: 'DELETE', credentials: 'include' })
    router.push('/system-admin/users')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-zinc-900 px-4 py-2 flex items-center justify-between gap-4 text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          Impersonating <strong>{ctx.userName}</strong>
          {ctx.clubName && <span className="font-normal"> · {ctx.clubName}</span>}
          <span className="font-normal text-zinc-700 ml-1">({ctx.role})</span>
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-1.5 flex-shrink-0 rounded-md bg-zinc-900/20 hover:bg-zinc-900/30 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60"
      >
        <X className="h-3.5 w-3.5" />
        {exiting ? 'Exiting…' : 'Exit impersonation'}
      </button>
    </div>
  )
}
