'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardHeroChatProps {
  firstName: string
  chatEndpoint: string
}

const CHIPS = [
  { label: 'Athletes this week', q: 'How many new athletes registered this week?' },
  { label: 'Revenue summary', q: 'What is our total revenue this season so far?' },
  { label: 'Missing waivers', q: 'Which athletes are missing required waivers?' },
  { label: 'Upcoming events', q: 'What events do we have coming up this week?' },
  { label: "Who hasn't paid?", q: 'Which athletes have unpaid registrations?' },
]

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-1" />
    if (/^#{1,2} /.test(line)) return <p key={i} className="font-semibold text-zinc-200 mt-3 first:mt-0">{line.replace(/^#{1,2} /, '')}</p>
    if (/^### /.test(line)) return <p key={i} className="font-medium text-zinc-300 mt-2">{line.replace(/^### /, '')}</p>
    if (/^[*-] /.test(line)) {
      return (
        <div key={i} className="flex gap-2">
          <span className="text-orange-400/60 shrink-0 mt-0.5">•</span>
          <span>{line.replace(/^[*-] /, '')}</span>
        </div>
      )
    }
    return <p key={i}>{line}</p>
  })
}

export function DashboardHeroChat({ firstName, chatEndpoint }: DashboardHeroChatProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    const nextMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...messages,
      { role: 'user', content: userMsg },
    ]
    setMessages(nextMessages)
    setLoading(true)
    try {
      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages([...nextMessages, { role: 'assistant', content: data.message }])
    } catch {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Greeting */}
      <div className="flex items-center gap-4">
        <Sparkles className="h-9 w-9 text-orange-500 shrink-0" />
        <h1 className="text-4xl font-semibold text-foreground tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
      </div>

      {/* Single unified thread */}
      <div className="w-full max-w-2xl flex flex-col gap-5">

        {/* Messages — no wrapper box, flow naturally */}
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            // User: right-aligned bubble
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] bg-zinc-800 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-zinc-100 leading-relaxed">
                {msg.content}
              </div>
            </div>
          ) : (
            // AI: left-aligned plain text with sparkle icon — no box
            <div key={i} className="flex gap-3 items-start">
              <Sparkles className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-sm text-zinc-300 leading-relaxed space-y-1 flex-1">
                {renderContent(msg.content)}
              </div>
            </div>
          )
        )}

        {/* Loading state — same left-aligned style */}
        {loading && (
          <div className="flex gap-3 items-center">
            <Sparkles className="h-4 w-4 text-orange-500 shrink-0 animate-pulse" />
            <span className="text-sm text-zinc-500">Thinking…</span>
          </div>
        )}

        <div ref={bottomRef} />

        {/* Input */}
        <div className="relative rounded-2xl border border-zinc-700 bg-zinc-800/60 shadow-lg transition-all focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-700/60">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="How can I help you today?"
            rows={3}
            disabled={loading}
            className="w-full bg-transparent px-5 py-4 pr-16 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={cn(
              'absolute right-3 bottom-3 w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              input.trim() && !loading
                ? 'bg-orange-600 hover:bg-orange-500 cursor-pointer'
                : 'bg-zinc-700 cursor-not-allowed'
            )}
          >
            <ArrowUp className={cn('h-4 w-4', input.trim() && !loading ? 'text-white' : 'text-zinc-500')} />
          </button>
        </div>

        {/* Chips — only before first message */}
        {messages.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => {
                  setInput(chip.q)
                  textareaRef.current?.focus()
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Clear — subtle, inside the thread */}
        {messages.length > 0 && !loading && (
          <div className="flex justify-center">
            <button
              onClick={() => setMessages([])}
              className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
            >
              Clear conversation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
