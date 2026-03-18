'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useRequireAdmin } from '@/lib/auth-context'
import { AdminPageHeader } from '@/components/admin-page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { InlineLoading } from '@/components/ui/loading-states'
import { Sparkles, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Reuse the same markdown renderer from training plan
function BriefingDisplay({ text }: { text: string }) {
  const sections = text.split(/^(#{1,3} .+)$/m).filter(Boolean)
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {sections.map((section, i) => {
        if (/^#{1,3} /.test(section)) {
          const level = (section.match(/^(#+)/) || ['', ''])[1].length
          const title = section.replace(/^#+\s*/, '')
          if (level === 1) return <h2 key={i} className="text-xl font-bold text-foreground mt-6 first:mt-0">{title}</h2>
          if (level === 2) return <h3 key={i} className="text-base font-semibold text-foreground mt-5 border-b border-border pb-1">{title}</h3>
          return <h4 key={i} className="text-sm font-semibold text-blue-400 mt-4">{title}</h4>
        }
        const lines = section.split('\n').filter((l) => l.trim())
        return (
          <div key={i} className="space-y-1.5">
            {lines.map((line, j) => {
              if (/^\*\*(.+)\*\*$/.test(line.trim()))
                return <p key={j} className="font-semibold text-foreground">{line.replace(/\*\*/g, '')}</p>
              if (line.trim().startsWith('- ') || line.trim().startsWith('• '))
                return (
                  <div key={j} className="flex gap-2">
                    <span className="text-blue-400 mt-1 shrink-0">•</span>
                    <span className="text-muted-foreground">{line.replace(/^[-•]\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1')}</span>
                  </div>
                )
              if (line.trim() === '---') return <hr key={j} className="my-3 border-border" />
              return <p key={j} className="text-muted-foreground">{line.replace(/\*\*(.+?)\*\*/g, '$1')}</p>
            })}
          </div>
        )
      })}
    </div>
  )
}

export default function DailyBriefingPage() {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const { profile, loading: authLoading } = useRequireAdmin()

  const [date, setDate] = useState(todayISO)
  const [generating, setGenerating] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [briefing, setBriefing] = useState<{ text: string; date: string } | null>(null)

  if (authLoading) return <InlineLoading message="Loading…" />
  if (!profile) return null

  async function handleGenerate() {
    setGenerating(true)
    setStreamingText('')
    setBriefing(null)

    try {
      const res = await fetch('/api/admin/ai/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to generate briefing')
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamingText(accumulated)
      }

      setBriefing({ text: accumulated, date })
      setStreamingText('')
      toast.success('Briefing generated')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const dateLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''

  const displayText = streamingText || briefing?.text || ''

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <AdminPageHeader
        title="Daily Training Briefing"
        description="AI summary of what every program is focusing on for a given day"
        backHref={`/clubs/${clubSlug}/admin`}
      />

      <div className="flex items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="briefing-date" className="flex items-center gap-1.5 text-sm font-medium">
            <Calendar className="h-3.5 w-3.5" />
            Date
          </Label>
          <Input
            id="briefing-date"
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setBriefing(null) }}
            className="w-44"
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating || !date}
          className="gap-2"
        >
          {generating ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Briefing
            </>
          )}
        </Button>
        {briefing && (
          <Badge variant="outline" className="bg-purple-950/30 text-purple-400 border-purple-800/40">
            {dateLabel}
          </Badge>
        )}
      </div>

      {!displayText && !generating && (
        <Card className="border-dashed min-h-[300px]">
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
            <div className="rounded-full bg-purple-950/30 p-4">
              <Sparkles className="h-8 w-8 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">Select a date and generate a briefing</p>
              <p className="text-sm text-muted-foreground mt-1">
                Claude will summarise what each program is focusing on based on the scheduled sessions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {displayText && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className={cn('h-4 w-4', generating ? 'text-purple-400 animate-pulse' : 'text-purple-500')} />
              <CardTitle className="text-base">
                {generating ? 'Generating briefing…' : `Briefing — ${dateLabel}`}
              </CardTitle>
            </div>
            {!generating && (
              <CardDescription>AI-generated summary based on today's scheduled events</CardDescription>
            )}
          </CardHeader>
          <CardContent className="border-t pt-4 max-h-[70vh] overflow-y-auto">
            <BriefingDisplay text={displayText} />
            {generating && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t text-xs text-purple-500">
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                Writing…
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
