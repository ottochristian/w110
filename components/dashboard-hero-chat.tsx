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

function renderLines(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-1" />
    if (/^#{1,2} /.test(line)) return <p key={i} className="font-semibold text-zinc-200 mt-2 first:mt-0">{line.replace(/^#{1,2} /, '')}</p>
    if (/^### /.test(line)) return <p key={i} className="font-medium text-zinc-300 mt-1">{line.replace(/^### /, '')}</p>
    if (/^[*-] /.test(line)) {
      const content = line.replace(/^[*-] /, '')
      return (
        <div key={i} className="flex gap-1.5">
          <span className="text-orange-400/70 shrink-0 mt-0.5">•</span>
          <span>{content}</span>
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  // Scroll to latest message
  useEffect(() => {
    if (messages.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Greeting */}
      <div className="flex items-center gap-3 text-center">
        <Sparkles className="h-7 w-7 text-orange-500 shrink-0" />
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
      </div>

      {/* Chat area */}
      <div className="w-full max-w-2xl space-y-3">
        {/* Conversation history */}
        {messages.length > 0 && (
          <div className="space-y-2 text-left">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-200 ml-10'
                    : 'bg-orange-950/40 border border-orange-900/30 text-zinc-300'
                )}
              >
                {msg.role === 'assistant' ? renderLines(msg.content) : msg.content}
              </div>
            ))}
            {loading && (
              <div className="bg-zinc-800/50 rounded-xl px-4 py-3 text-sm text-zinc-500 animate-pulse">
                Thinking…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input box */}
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
            placeholder={messages.length === 0 ? 'How can I help you today?' : 'Ask a follow-up…'}
            rows={2}
            disabled={loading}
            className="w-full bg-transparent px-5 py-4 pr-16 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-3 bottom-3 w-9 h-9 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ArrowUp className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Chips — only before first message */}
        {messages.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
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

        {/* Clear */}
        {messages.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={() => setMessages([])}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Clear conversation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
