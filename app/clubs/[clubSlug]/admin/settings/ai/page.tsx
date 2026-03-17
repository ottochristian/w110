'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRequireAdmin } from '@/lib/auth-context'
import { AdminPageHeader } from '@/components/admin-page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { InlineLoading } from '@/components/ui/loading-states'
import { Sparkles, Zap, BarChart3, ShieldCheck, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

interface AIStatus {
  ai_enabled: boolean
  ai_auto_briefing: boolean
  usage_this_month: { requests: number; tokens: number }
}

export default function AISettingsPage() {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const { profile, loading: authLoading } = useRequireAdmin()

  const [status, setStatus] = useState<AIStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [togglingBriefing, setTogglingBriefing] = useState(false)
  const [context, setContext] = useState('')
  const [savedContext, setSavedContext] = useState('')
  const [savingContext, setSavingContext] = useState(false)

  useEffect(() => {
    if (!profile) return
    fetch('/api/admin/ai/toggle')
      .then((r) => r.json())
      .then((data) => { setStatus(data); setLoading(false) })
      .catch(() => setLoading(false))
    fetch('/api/admin/ai/context')
      .then((r) => r.json())
      .then((data) => {
        setContext(data.ai_training_context ?? '')
        setSavedContext(data.ai_training_context ?? '')
      })
  }, [profile])

  async function handleSaveContext() {
    setSavingContext(true)
    try {
      const res = await fetch('/api/admin/ai/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_training_context: context }),
      })
      if (!res.ok) throw new Error()
      setSavedContext(context)
      toast.success('Training context saved')
    } catch {
      toast.error('Failed to save context')
    } finally {
      setSavingContext(false)
    }
  }

  async function handleToggleBriefing(enabled: boolean) {
    setTogglingBriefing(true)
    try {
      const res = await fetch('/api/admin/ai/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_auto_briefing: enabled }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setStatus((prev) => prev ? { ...prev, ai_auto_briefing: data.ai_auto_briefing } : prev)
      toast.success(`Auto briefing ${data.ai_auto_briefing ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error('Failed to update auto briefing setting')
    } finally {
      setTogglingBriefing(false)
    }
  }

  async function handleToggle(enabled: boolean) {
    setToggling(true)
    try {
      const res = await fetch('/api/admin/ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setStatus((prev) => prev ? { ...prev, ai_enabled: data.ai_enabled } : prev)
      toast.success(`AI features ${data.ai_enabled ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error('Failed to update AI settings')
    } finally {
      setToggling(false)
    }
  }

  if (authLoading || loading) return <InlineLoading message="Loading…" />
  if (!profile || !status) return null

  const estimatedCostUsd = ((status.usage_this_month.tokens / 1_000_000) * 3).toFixed(4)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="AI & Intelligence"
        description="Control AI-powered features for your club"
        backHref={`/clubs/${clubSlug}/admin/settings`}
      />

      {/* Main toggle card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>AI Features</CardTitle>
                <CardDescription className="mt-1">
                  Enable AI-powered tools for coaches and admins — training plan generation and more.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge
                variant="outline"
                className={
                  status.ai_enabled
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-zinc-300 bg-zinc-50 text-zinc-500'
                }
              >
                {status.ai_enabled ? 'Active' : 'Inactive'}
              </Badge>
              <Switch
                checked={status.ai_enabled}
                onCheckedChange={handleToggle}
                disabled={toggling}
                aria-label="Toggle AI features"
              />
            </div>
          </div>
        </CardHeader>
        {status.ai_enabled && (
          <CardContent className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Coaches can now access <strong>AI Training Plan</strong> from their dashboard.
              Plans are generated using Claude AI and scoped strictly to your club, season, and program data.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Auto daily briefing */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Auto Daily Briefing</CardTitle>
                <CardDescription className="mt-1">
                  Automatically generate an AI training briefing for today when an admin logs in. Disabled by default to save costs.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge
                variant="outline"
                className={
                  status.ai_auto_briefing
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-zinc-300 bg-zinc-50 text-zinc-500'
                }
              >
                {status.ai_auto_briefing ? 'On' : 'Off'}
              </Badge>
              <Switch
                checked={status.ai_auto_briefing}
                onCheckedChange={handleToggleBriefing}
                disabled={togglingBriefing || !status.ai_enabled}
                aria-label="Toggle auto daily briefing"
              />
            </div>
          </div>
        </CardHeader>
        {!status.ai_enabled && (
          <CardContent className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Enable AI features above to use auto briefing.</p>
          </CardContent>
        )}
      </Card>

      {/* Training context */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Club Training Context</CardTitle>
              <CardDescription>
                Background info automatically included in every AI training plan — club philosophy, venue details, season goals, competition calendar.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="ai-context" className="text-sm text-muted-foreground">
            This context is injected into every plan generated by coaches at your club. Keep it factual and relevant.
          </Label>
          <Textarea
            id="ai-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={`e.g. "We are based in Jackson Hole, WY. Our alpine program focuses on giant slalom and super-G. Competition season runs January–March with regional qualifiers in February. Athletes train on Snow King Mountain 4 days/week. This season's emphasis is on edge control and body positioning through gates."`}
            rows={6}
            className="text-sm resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{context.length} characters</p>
            <Button
              onClick={handleSaveContext}
              disabled={savingContext || context === savedContext}
              size="sm"
            >
              {savingContext ? 'Saving…' : 'Save Context'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage this month */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>AI requests generated by your club's coaches</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-zinc-50 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-900">{status.usage_this_month.requests}</p>
              <p className="text-xs text-muted-foreground mt-1">Plans generated</p>
            </div>
            <div className="rounded-lg border bg-zinc-50 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-900">
                {status.usage_this_month.tokens.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tokens used</p>
            </div>
            <div className="rounded-lg border bg-zinc-50 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-900">${estimatedCostUsd}</p>
              <p className="text-xs text-muted-foreground mt-1">Est. cost (USD)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's included */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>What's Included</CardTitle>
              <CardDescription>AI features available to your club</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">AI Training Plan Generator</span>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Coaches select a program, sub-program, and group — Claude generates a full structured weekly training plan in seconds.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2 opacity-40">
              <Zap className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Revenue Forecasting</span>
                <p className="text-muted-foreground text-xs mt-0.5">Coming soon — AI pricing and enrollment analysis.</p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Security notice */}
      <Card className="border-zinc-200 bg-zinc-50">
        <CardContent className="flex items-start gap-3 pt-5">
          <ShieldCheck className="h-5 w-5 text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-600">
            All AI requests are server-side and scoped to your club's data only. No data from other clubs is ever included in prompts. API keys are stored securely and never exposed to the browser.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
