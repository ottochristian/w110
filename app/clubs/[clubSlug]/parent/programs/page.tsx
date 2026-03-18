'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useParentClub } from '@/lib/use-parent-club'
import { useCurrentSeason } from '@/lib/contexts/season-context'
import { usePrograms } from '@/lib/hooks/use-programs'
import { useCart } from '@/lib/cart-context'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Check, Plus, Minus, Users } from 'lucide-react'
import { ProgramStatus } from '@/lib/programStatus'
import { InlineLoading } from '@/components/ui/loading-states'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Athlete = {
  id: string
  first_name: string
  last_name: string
}

type SubProgram = {
  id: string
  name: string
  description?: string | null
  registration_fee?: number | null
  max_capacity?: number | null
  status: ProgramStatus
  program_id: string
  registrations?: { count: number }[]
}

type Program = {
  id: string
  name: string
  description?: string | null
  status: ProgramStatus | null
  sub_programs: SubProgram[]
}

// sub_program_id → Set of athlete_ids that are already confirmed/pending registered
type ExistingRegistrations = Record<string, Set<string>>

function AthleteChip({
  athlete,
  state,
  onClick,
  disabled,
}: {
  athlete: Athlete
  state: 'default' | 'in-cart' | 'registered'
  onClick: () => void
  disabled: boolean
}) {
  const name = athlete.first_name

  if (state === 'registered') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-800 bg-green-950/30 px-2.5 py-1 text-xs font-medium text-green-400">
        <Check className="h-3 w-3" />
        {name}
      </span>
    )
  }

  if (state === 'in-cart') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-full border border-orange-600 bg-orange-600 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        title={`Remove ${name} from cart`}
      >
        <Minus className="h-3 w-3" />
        {name}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        disabled
          ? 'cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-500'
          : 'cursor-pointer border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-orange-500 hover:bg-orange-950/30 hover:text-orange-400'
      )}
      title={disabled ? undefined : `Add ${name} to cart`}
    >
      <Plus className="h-3 w-3" />
      {name}
    </button>
  )
}

export default function ParentProgramsPage() {
  const params = useParams()
  const router = useRouter()
  const clubSlug = params.clubSlug as string
  const { clubId, household, athletes, loading: authLoading } = useParentClub()
  const { addItem, removeItem, items: cartItems, itemCount } = useCart()
  const currentSeason = useCurrentSeason()

  const {
    data: allPrograms = [],
    isLoading: programsLoading,
  } = usePrograms(currentSeason?.id, true)

  const [existingRegs, setExistingRegs] = useState<ExistingRegistrations>({})
  const [regsLoading, setRegsLoading] = useState(false)

  // Fetch existing registrations for this household + season so we can
  // show "already registered" state on each athlete chip
  useEffect(() => {
    if (!currentSeason?.id || !household?.id) return
    setRegsLoading(true)
    const supabase = createClient()
    supabase
      .from('registrations')
      .select('sub_program_id, athlete_id, status')
      .eq('season_id', currentSeason.id)
      .in('status', ['confirmed', 'pending', 'waitlisted'])
      .then(({ data }) => {
        const map: ExistingRegistrations = {}
        for (const row of data ?? []) {
          if (!row.sub_program_id || !row.athlete_id) continue
          if (!map[row.sub_program_id]) map[row.sub_program_id] = new Set()
          map[row.sub_program_id].add(row.athlete_id)
        }
        setExistingRegs(map)
        setRegsLoading(false)
      })
  }, [currentSeason?.id, household?.id])

  const programs = (allPrograms as Program[]).filter(
    (p) => p.status === ProgramStatus.ACTIVE || p.status === null
  )

  const isSeasonClosed = currentSeason?.status === 'closed'
  const isSeasonDraft = currentSeason?.status === 'draft'
  const isLoading = authLoading || programsLoading || regsLoading

  // Helper: get chip state for a given athlete + sub-program
  function chipState(athleteId: string, subProgramId: string): 'default' | 'in-cart' | 'registered' {
    if (existingRegs[subProgramId]?.has(athleteId)) return 'registered'
    if (cartItems.some(i => i.athlete_id === athleteId && i.sub_program_id === subProgramId)) return 'in-cart'
    return 'default'
  }

  function handleChipClick(athlete: Athlete, subProgram: SubProgram, program: Program) {
    const state = chipState(athlete.id, subProgram.id)
    if (state === 'registered') return

    if (state === 'in-cart') {
      const cartItemId = `${subProgram.id}-${athlete.id}`
      removeItem(cartItemId)
      toast.info(`Removed ${athlete.first_name} from cart`, {
        description: `${program.name} — ${subProgram.name}`,
        duration: 2000,
      })
      return
    }

    // Add to cart
    const spotsLeft = subProgram.max_capacity != null
      ? subProgram.max_capacity - (subProgram.registrations?.[0]?.count ?? 0)
      : Infinity
    if (spotsLeft <= 0) {
      toast.error(`${subProgram.name} is full`)
      return
    }

    addItem({
      id: `${subProgram.id}-${athlete.id}`,
      athlete_id: athlete.id,
      athlete_name: `${athlete.first_name} ${athlete.last_name}`,
      sub_program_id: subProgram.id,
      sub_program_name: subProgram.name,
      program_name: program.name,
      price: subProgram.registration_fee ?? 0,
    })
    toast.success(`${athlete.first_name} added to cart`, {
      description: `${program.name} — ${subProgram.name}`,
      duration: 4000,
      action: {
        label: 'View Cart →',
        onClick: () => router.push(`/clubs/${clubSlug}/parent/cart`),
      },
    })
  }

  // ── Guard states ────────────────────────────────────────────────────────────

  if (isLoading && !currentSeason) return <InlineLoading />

  if (!authLoading && !currentSeason) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg text-center">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-2xl">No Season Available</CardTitle>
            <CardDescription>
              No current season found. Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isSeasonDraft) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg text-center">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-2xl">Coming Soon</CardTitle>
            <CardDescription>
              Registration for {currentSeason?.name} is being set up. Check back soon.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!household || !athletes || athletes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Please add athletes to your household before registering for programs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Register for Programs</h1>
          <p className="text-muted-foreground">
            {currentSeason?.name} — tap a name on any program to add that athlete
          </p>
        </div>
        <Link href={`/clubs/${clubSlug}/parent/cart`}>
          <Button variant={itemCount > 0 ? 'default' : 'outline'} className="shrink-0 gap-2 relative">
            <ShoppingCart className="h-4 w-4" />
            Cart
            {itemCount > 0 && (
              <span className="ml-0.5 rounded-full bg-zinc-900 text-orange-400 text-xs font-bold px-1.5 py-0.5 leading-none">
                {itemCount}
              </span>
            )}
          </Button>
        </Link>
      </div>

      {/* Athletes legend */}
      {athletes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            Your athletes:
          </span>
          {(athletes as Athlete[]).map((a) => (
            <span key={a.id} className="font-medium">
              {a.first_name} {a.last_name}
            </span>
          ))}
          <span className="ml-auto text-muted-foreground hidden sm:inline">
            Tap a name on a program to register · Filled blue = in cart · Green = registered
          </span>
        </div>
      )}

      {isSeasonClosed && (
        <div className="rounded-lg border border-orange-800 bg-orange-950/20 px-4 py-3 text-sm text-orange-400">
          Registration for {currentSeason?.name} is closed.
        </div>
      )}

      {/* Programs */}
      {programsLoading ? (
        <InlineLoading />
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No active programs available for this season.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {programs.map((program) => {
            const activeSubPrograms = (program.sub_programs ?? []).filter(
              (sp) => sp.status === ProgramStatus.ACTIVE
            )
            if (activeSubPrograms.length === 0) return null

            return (
              <Card key={program.id}>
                <CardHeader className="pb-3">
                  <CardTitle>{program.name}</CardTitle>
                  {program.description && (
                    <CardDescription>{program.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeSubPrograms.map((sp) => {
                    const registrationCount = sp.registrations?.[0]?.count ?? 0
                    const spotsLeft = sp.max_capacity != null
                      ? sp.max_capacity - registrationCount
                      : null
                    const isFull = spotsLeft !== null && spotsLeft <= 0

                    return (
                      <div
                        key={sp.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        {/* Sub-program info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{sp.name}</span>
                            {isFull && (
                              <Badge variant="destructive" className="text-xs">Full</Badge>
                            )}
                            {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5 && (
                              <Badge variant="outline" className="text-xs text-orange-400 border-orange-700">
                                {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                              </Badge>
                            )}
                          </div>
                          {sp.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground">{sp.description}</p>
                          )}
                          {sp.registration_fee != null && (
                            <p className="mt-1 text-base font-medium">
                              ${sp.registration_fee.toFixed(2)}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">per athlete</span>
                            </p>
                          )}
                        </div>

                        {/* Athlete chips */}
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {(athletes as Athlete[]).map((athlete) => {
                            const state = chipState(athlete.id, sp.id)
                            return (
                              <AthleteChip
                                key={athlete.id}
                                athlete={athlete}
                                state={state}
                                onClick={() => handleChipClick(athlete, sp, program)}
                                disabled={isSeasonClosed || (isFull && state === 'default')}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Sticky cart button on mobile when cart has items */}
      {itemCount > 0 && (
        <div className="sticky bottom-4 flex justify-center sm:hidden">
          <Link href={`/clubs/${clubSlug}/parent/cart`}>
            <Button size="lg" className="shadow-lg gap-2 px-8">
              <ShoppingCart className="h-5 w-5" />
              View Cart ({itemCount}) · ${cartItems.reduce((s, i) => s + i.price, 0).toFixed(2)}
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
