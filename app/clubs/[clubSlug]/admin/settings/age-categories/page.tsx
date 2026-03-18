'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useClub } from '@/lib/club-context'
import { createClient } from '@/lib/supabase/client'
import {
  FIS_DEFAULT_CATEGORIES,
  currentSeasonEndYear,
  type AgeCategory,
  type AgeCalculationMethod,
} from '@/lib/ski-categories'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InlineLoading } from '@/components/ui/loading-states'
import { ExternalLink, RotateCcw, Save, Info } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AgeCategoriesSettingsPage() {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const { club, loading: clubLoading } = useClub()
  const [supabase] = useState(() => createClient())

  const [method, setMethod] = useState<AgeCalculationMethod>('fis_competition_year')
  const [categories, setCategories] = useState<AgeCategory[]>(FIS_DEFAULT_CATEGORIES)
  const [isCustom, setIsCustom] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load club settings
  useEffect(() => {
    if (!club) return
    const c = club as any
    setMethod(c.age_calculation_method ?? 'fis_competition_year')
    if (c.age_categories) {
      setCategories(c.age_categories)
      setIsCustom(true)
    } else {
      setCategories(FIS_DEFAULT_CATEGORIES)
      setIsCustom(false)
    }
  }, [club])

  async function save() {
    if (!club) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          age_calculation_method: method,
          age_categories: isCustom ? categories : null,
        })
        .eq('id', club.id)

      if (error) throw error
      toast.success('Age category settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function resetToDefaults() {
    setCategories(FIS_DEFAULT_CATEGORIES)
    setIsCustom(false)
    toast.info('Reset to FIS/USSA defaults — click Save to apply')
  }

  function updateCategory(index: number, field: keyof AgeCategory, value: string | number) {
    setIsCustom(true)
    setCategories((prev) =>
      prev.map((cat, i) => (i === index ? { ...cat, [field]: field === 'name' ? value : Number(value) } : cat))
    )
  }

  function addCategory() {
    setIsCustom(true)
    setCategories((prev) => [...prev, { name: '', minAge: 0, maxAge: 0 }])
  }

  function removeCategory(index: number) {
    setIsCustom(true)
    setCategories((prev) => prev.filter((_, i) => i !== index))
  }

  const seasonYear = currentSeasonEndYear()

  if (clubLoading) return <InlineLoading />

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link href={`/clubs/${clubSlug}/admin/settings`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Settings
        </Link>
        <h1 className="page-title mt-2">Age Categories</h1>
        <p className="text-muted-foreground mt-1">
          Configure how athlete competition ages and ski categories are calculated.
        </p>
      </div>

      {/* Reference links */}
      <div className="rounded-lg border border-blue-800/40 bg-blue-950/30 px-4 py-3 text-sm text-blue-300 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 font-medium">
          <Info className="h-4 w-4 flex-shrink-0" />
          Official references
        </div>
        <a
          href="https://usskiandsnowboard.org/sport-programs/alpine/alpine-officials"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:underline ml-5"
        >
          US Ski &amp; Snowboard Alpine Technical Package
          <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href="https://www.fis-ski.com/en/inside-fis/document-library/alpine-skiing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:underline ml-5"
        >
          FIS Alpine International Competition Rules (ICR)
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Calculation method */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Method</CardTitle>
          <CardDescription>
            How competition age is determined for each athlete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${method === 'fis_competition_year' ? 'border-orange-500 bg-orange-950/20' : 'hover:bg-secondary/50'}`}>
            <input
              type="radio"
              name="method"
              value="fis_competition_year"
              checked={method === 'fis_competition_year'}
              onChange={() => setMethod('fis_competition_year')}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">FIS Competition Year <span className="ml-1.5 rounded-full bg-orange-900/40 px-2 py-0.5 text-xs font-semibold text-orange-400">Recommended</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Competition age = season end year − birth year. For the {seasonYear - 1}/{String(seasonYear).slice(2)} season, the end year is <strong>{seasonYear}</strong>. All athletes born in the same year share the same category, regardless of birthday.
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${method === 'calendar_age' ? 'border-orange-500 bg-orange-950/20' : 'hover:bg-secondary/50'}`}>
            <input
              type="radio"
              name="method"
              value="calendar_age"
              checked={method === 'calendar_age'}
              onChange={() => setMethod('calendar_age')}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">Calendar Age</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uses the athlete's actual current age based on today's date. Simpler, but not aligned with FIS/USSA sanctioned race rules.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Category definitions */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Category Definitions</CardTitle>
              <CardDescription>
                {isCustom
                  ? 'Custom categories — deviates from FIS/USSA defaults.'
                  : 'Using FIS/USSA standard categories.'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetToDefaults} className="gap-1.5 flex-shrink-0">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to FIS defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_80px_32px] gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">Category</span>
            <span className="text-xs font-medium text-muted-foreground">Min age</span>
            <span className="text-xs font-medium text-muted-foreground">Max age</span>
            <span />
          </div>

          {categories.map((cat, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_80px_32px] gap-2 items-center">
              <input
                type="text"
                value={cat.name}
                onChange={(e) => updateCategory(i, 'name', e.target.value)}
                className="rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. U16"
              />
              <input
                type="number"
                value={cat.minAge}
                min={0}
                onChange={(e) => updateCategory(i, 'minAge', e.target.value)}
                className="rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="number"
                value={cat.maxAge === 999 ? '' : cat.maxAge}
                min={0}
                placeholder="∞"
                onChange={(e) => updateCategory(i, 'maxAge', e.target.value === '' ? 999 : e.target.value)}
                className="rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => removeCategory(i)}
                className="text-muted-foreground hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addCategory} className="mt-2">
            + Add category
          </Button>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="gap-2 w-fit">
        <Save className="h-4 w-4" />
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}
