'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, AlertTriangle, Bell, Send, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Nudge {
  id: string
  type: string
  severity: 'red' | 'amber'
  title: string
  detail: string
  send_target: { type: 'program' | 'sub_program' | 'group'; id: string; name: string } | null
  recipient_count: number | null
  preview_names: string[]
  coach_name?: string
}

interface Draft {
  subject: string
  body: string
}

interface NudgesWidgetProps {
  nudgesEndpoint: string
  draftEndpoint: string
  sendEndpoint: string
  clubSlug: string
}

function NudgeIcon({ severity }: { severity: 'red' | 'amber' }) {
  return severity === 'red'
    ? <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
    : <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
}

function DraftModal({
  nudge,
  draft,
  onClose,
  onSend,
  sending,
  clubSlug,
  sendEndpoint,
}: {
  nudge: Nudge
  draft: Draft
  onClose: () => void
  onSend: (subject: string, body: string) => void
  sending: boolean
  clubSlug: string
  sendEndpoint: string
}) {
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-1">AI Draft</p>
            <p className="text-sm font-semibold text-foreground">{nudge.title}</p>
            {nudge.recipient_count && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Sending to {nudge.recipient_count} {nudge.recipient_count === 1 ? 'family' : 'families'}
                {nudge.preview_names.length > 0 && (
                  <span className="text-zinc-600"> — {nudge.preview_names.join(', ')}{nudge.recipient_count > nudge.preview_names.length ? ` +${nudge.recipient_count - nudge.preview_names.length} more` : ''}</span>
                )}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors ml-4 flex-shrink-0">
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-700/60"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-700/60 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800 flex-shrink-0">
          <p className="text-xs text-zinc-600">Review before sending — you can edit above</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSend(subject, body)}
              disabled={sending || !subject.trim() || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white transition-colors"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {sending ? 'Sending…' : `Send to ${nudge.send_target?.name ?? 'group'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NudgesWidget({ nudgesEndpoint, draftEndpoint, sendEndpoint, clubSlug }: NudgesWidgetProps) {
  const [nudges, setNudges] = useState<Nudge[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [drafting, setDrafting] = useState<string | null>(null)
  const [activeDraft, setActiveDraft] = useState<{ nudge: Nudge; draft: Draft } | null>(null)
  const [sending, setSending] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(nudgesEndpoint)
      .then(r => r.json())
      .then(data => setNudges(data.nudges ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [nudgesEndpoint])

  const visible = nudges.filter(n => !dismissed.has(n.id) && !sentIds.has(n.id))

  async function handleDraft(nudge: Nudge) {
    setDrafting(nudge.id)
    try {
      const res = await fetch(draftEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: nudge.type,
          title: nudge.title,
          detail: nudge.detail,
          target_name: nudge.send_target?.name ?? '',
          recipient_count: nudge.recipient_count,
          preview_names: nudge.preview_names,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setActiveDraft({ nudge, draft: data })
    } catch {
      // silent — button returns to normal
    } finally {
      setDrafting(null)
    }
  }

  async function handleSend(subject: string, body: string) {
    if (!activeDraft?.nudge.send_target) return
    setSending(true)
    try {
      const res = await fetch(sendEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubSlug,
          subject,
          body,
          targets: [{
            type: activeDraft.nudge.send_target.type,
            id: activeDraft.nudge.send_target.id,
          }],
        }),
      })
      if (!res.ok) throw new Error()
      setSentIds(prev => new Set([...prev, activeDraft.nudge.id]))
      setActiveDraft(null)
    } catch {
      // keep modal open so user can retry
    } finally {
      setSending(false)
    }
  }

  if (loading) return null
  if (visible.length === 0) return null

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Nudges</span>
        </div>

        {visible.map((nudge) => (
          <div
            key={nudge.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3',
              nudge.severity === 'red'
                ? 'border-red-800/50 bg-red-950/30'
                : 'border-amber-800/40 bg-amber-950/20'
            )}
          >
            <NudgeIcon severity={nudge.severity} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', nudge.severity === 'red' ? 'text-red-200' : 'text-amber-200')}>
                {nudge.title}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{nudge.detail}</p>
              {nudge.preview_names.length > 0 && (
                <p className="text-xs text-zinc-600 mt-0.5">
                  {nudge.preview_names.join(', ')}{nudge.recipient_count && nudge.recipient_count > nudge.preview_names.length ? ` +${nudge.recipient_count - nudge.preview_names.length} more` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {nudge.send_target && (
                <button
                  onClick={() => handleDraft(nudge)}
                  disabled={drafting === nudge.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-xs font-medium text-zinc-200 transition-colors"
                >
                  {drafting === nudge.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  {drafting === nudge.id ? 'Drafting…' : 'Draft & Send'}
                </button>
              )}
              <button
                onClick={() => setDismissed(prev => new Set([...prev, nudge.id]))}
                className="p-1 rounded-md hover:bg-zinc-800/60 transition-colors"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeDraft && (
        <DraftModal
          nudge={activeDraft.nudge}
          draft={activeDraft.draft}
          onClose={() => setActiveDraft(null)}
          onSend={handleSend}
          sending={sending}
          clubSlug={clubSlug}
          sendEndpoint={sendEndpoint}
        />
      )}
    </>
  )
}
