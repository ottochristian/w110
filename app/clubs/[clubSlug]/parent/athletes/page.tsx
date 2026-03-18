'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useParentClub } from '@/lib/use-parent-club'
import { useClub } from '@/lib/club-context'
import { Button } from '@/components/ui/button'
import { InlineLoading } from '@/components/ui/loading-states'
import { Plus, ChevronRight, User } from 'lucide-react'
import { getAthleteCategory, FIS_DEFAULT_CATEGORIES, type AgeCalculationMethod } from '@/lib/ski-categories'

function AthleteInitials({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  return (
    <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
      <span className="text-foreground text-sm font-semibold">{initials}</span>
    </div>
  )
}

export default function ParentAthletesPage() {
  const params = useParams()
  const router = useRouter()
  const clubSlug = params.clubSlug as string
  const { athletes, loading, error } = useParentClub()
  const { club } = useClub()
  const ageMethod = ((club as any)?.age_calculation_method ?? 'fis_competition_year') as AgeCalculationMethod
  const ageCategories = (club as any)?.age_categories ?? FIS_DEFAULT_CATEGORIES

  if (loading) return <InlineLoading />

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/20 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Athletes</h1>
          <p className="text-muted-foreground mt-1">
            {athletes.length === 0
              ? 'No athletes in your household yet'
              : `${athletes.length} athlete${athletes.length !== 1 ? 's' : ''} in your household`}
          </p>
        </div>
        <Button onClick={() => router.push(`/clubs/${clubSlug}/parent/athletes/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Athlete
        </Button>
      </div>

      {/* Empty state */}
      {athletes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="font-medium text-foreground">No athletes yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Add your first athlete to start registering for programs.
          </p>
          <Button onClick={() => router.push(`/clubs/${clubSlug}/parent/athletes/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Athlete
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete) => (
            <Link
              key={athlete.id}
              href={`/clubs/${clubSlug}/parent/athletes/${athlete.id}`}
              className="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800"
            >
              <AthleteInitials firstName={athlete.first_name} lastName={athlete.last_name} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {athlete.first_name} {athlete.last_name}
                </p>
                {athlete.date_of_birth ? (
                  (() => {
                    const { age, category } = getAthleteCategory(athlete.date_of_birth, ageMethod, ageCategories)
                    return (
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-sm text-muted-foreground">{age} yrs</span>
                        <span className="inline-flex items-center rounded-full bg-orange-950/30 px-2 py-0.5 text-xs font-semibold text-orange-400">
                          {category}
                        </span>
                      </div>
                    )
                  })()
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">No date of birth</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors flex-shrink-0" />
            </Link>
          ))}

          {/* Add athlete card */}
          <button
            type="button"
            onClick={() => router.push(`/clubs/${clubSlug}/parent/athletes/new`)}
            className="flex items-center gap-4 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 p-4 text-left transition-colors hover:border-orange-700 hover:bg-orange-950/20"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <Plus className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500">Add another athlete</p>
          </button>
        </div>
      )}
    </div>
  )
}
