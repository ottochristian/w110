'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClubIntelligenceWidgetProps {
  summaryEndpoint: string   // GET to load cache, POST to regenerate
  chatEndpoint: string      // POST for Q&A
  chips?: Array<{ label: string; q: string }>
  title?: string
}

const DEFAULT_CHIPS = [
  { label: "Who hasn't paid?", q: "Which athletes have unpaid registrations?" },
  { label: 'Missing waivers', q: 'Which athletes are missing required waivers?' },
  { label: 'Revenue by program', q: 'Show me revenue broken down by program this season' },
  { label: 'New this week', q: 'How many new registrations did we get this week?' },
]

export function ClubIntelligenceWidget({
  summaryEndpoint,
  chatEndpoint,
  chips = DEFAULT_CHIPS,
  title = 'Club Intelligence',
}: ClubIntelligenceWidgetProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    fetch(summaryEndpoint)
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary_text ?? null)
        setGeneratedAt(data.generated_at ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [summaryEndpoint])

  async function handleRefresh() {
    setRefreshing(true)
    setSummary('')
    setExpanded(false)
    try {
      const res = await fetch(summaryEndpoint, { method: 'POST' })
      if (!res.ok) { setRefreshing(false); return }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setSummary(accumulated)
      }
      setGeneratedAt(new Date().toISOString())
    } finally {
      setRefreshing(false)
    }
  }

  async function handleChatSend() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    const nextMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...chatMessages,
      { role: 'user', content: userMsg },
    ]
    setChatMessages(nextMessages)
    setChatLoading(true)
    try {
      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setChatMessages([...nextMessages, { role: 'assistant', content: data.message }])
    } catch {
      setChatMessages([...nextMessages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  function formatAge(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const diffHrs = Math.floor(diffMs / 3_600_000)
    if (diffHrs < 1) return 'just now'
    if (diffHrs < 24) return `${diffHrs}h ago`
    return `${Math.floor(diffHrs / 24)}d ago`
  }

  function renderBold(str: string) {
    const parts = str.split(/\*\*(.+?)\*\*/)
    return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)
  }

  function renderLines(ls: string[]) {
    return ls.map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-1.5" />
      if (/^#{1,2} /.test(line)) return <p key={i} className="font-semibold text-zinc-200 mt-2 first:mt-0">{line.replace(/^#{1,2} /, '')}</p>
      if (/^### /.test(line)) return <p key={i} className="font-medium text-zinc-300 mt-1.5">{line.replace(/^### /, '')}</p>
      if (/^[*-] /.test(line)) return (
        <div key={i} className="flex gap-1.5">
          <span className="text-orange-500/70 shrink-0 mt-0.5">•</span>
          <span>{renderBold(line.replace(/^[*-] /, ''))}</span>
        </div>
      )
      return <p key={i}>{renderBold(line)}</p>
    })
  }

  const allLines = (summary ?? '').split('\n')
  let collapsedLines: string[] = []
  let wc = 0
  for (const line of allLines) {
    collapsedLines.push(line)
    wc += line.split(/\s+/).filter(Boolean).length
    if (wc >= 120) break
  }
  const isTruncated = !expanded && collapsedLines.length < allLines.length
  const visibleLines = expanded ? allLines : collapsedLines

  return (
    <div className="relative rounded-xl border border-orange-900/40 bg-zinc-900 overflow-hidden shadow-[0_0_50px_-15px_var(--glow-orange)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

      {/* Summary section */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className={cn('h-4 w-4', refreshing ? 'text-orange-400 animate-pulse' : 'text-orange-500')} />
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {generatedAt && !refreshing && (
              <span className="text-[11px] text-zinc-600">· {formatAge(generatedAt)}</span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh summary"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-zinc-500', refreshing && 'animate-spin')} />
          </button>
        </div>

        {loading && <p className="text-xs text-zinc-600 animate-pulse">Loading…</p>}

        {!loading && !summary && !refreshing && (
          <p className="text-sm text-zinc-500">
            No summary yet.{' '}
            <button onClick={handleRefresh} className="text-orange-500 hover:text-orange-400 underline-offset-2 hover:underline">
              Generate now →
            </button>
          </p>
        )}

        {refreshing && !summary && (
          <p className="text-xs text-zinc-500 animate-pulse">Generating summary…</p>
        )}

        {summary && (
          <div className="text-sm text-zinc-400 leading-relaxed space-y-1">
            {renderLines(visibleLines)}
            {refreshing && (
              <span className="inline-block w-1.5 h-3.5 bg-orange-500 animate-pulse ml-0.5 align-middle" />
            )}
            {isTruncated && !refreshing && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-1 block text-xs text-orange-500/70 hover:text-orange-400 transition-colors"
              >
                Show full summary ↓
              </button>
            )}
            {expanded && (
              <button
                onClick={() => setExpanded(false)}
                className="mt-1 block text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Show less ↑
              </button>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-zinc-800" />

      {/* Chat */}
      <div className="px-5 py-4 space-y-3">
        {chatMessages.length > 0 && (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pb-1">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'text-sm rounded-xl px-4 py-3 leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-200 ml-10'
                    : 'bg-orange-950/40 border border-orange-900/30 text-zinc-300 mr-4'
                )}
              >
                {msg.role === 'assistant' ? renderLines(msg.content.split('\n')) : msg.content}
              </div>
            ))}
            {chatLoading && (
              <div className="bg-zinc-800/60 text-zinc-500 text-sm rounded-xl px-4 py-3 mr-4 animate-pulse">
                Thinking…
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() }
            }}
            placeholder="Ask anything about your athletes, waivers, schedules…"
            rows={2}
            disabled={chatLoading}
            className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 pr-20 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-700/60 resize-none transition-all"
          />
          <button
            onClick={handleChatSend}
            disabled={chatLoading || !chatInput.trim()}
            className="absolute right-3 bottom-3 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white transition-colors"
          >
            Ask
          </button>
        </div>

        {chatMessages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => setChatInput(chip.q)}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-700/80 bg-zinc-800/40 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {chatMessages.length > 0 && (
          <button
            onClick={() => setChatMessages([])}
            className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  )
}
