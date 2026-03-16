'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, CheckCircle, XCircle, Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRequireAdmin } from '@/lib/auth-context'
import { useAthletesPaginated, useBatchWaiverCheck } from '@/lib/hooks/use-athletes'
import { useCurrentSeason } from '@/lib/contexts/season-context'
import { AdminPageHeader } from '@/components/admin-page-header'
import { InlineLoading, ErrorState } from '@/components/ui/loading-states'
import { useState, useEffect } from 'react'

interface Registration {
  id: string
  status: string
  payment_status: string
  season_id: string
  sub_program_id: string
  seasons: {
    id: string
    name: string
    is_current: boolean
  }
  sub_programs: {
    id: string
    name: string
    programs: {
      id: string
      name: string
    }
  }
}

interface Athlete {
  id: string
  first_name?: string
  last_name?: string
  date_of_birth?: string | null
  parent_id?: string
  registrations?: Registration[]
}

export default function AthletesPage() {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const { profile, loading: authLoading } = useRequireAdmin()
  const basePath = `/clubs/${clubSlug}/admin`

  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch paginated athletes
  const {
    data: paginatedData,
    isLoading,
    error,
    refetch,
  } = useAthletesPaginated(currentPage, pageSize, debouncedSearch)

  const athletes = paginatedData?.athletes || []
  const totalCount = paginatedData?.totalCount || 0
  const totalPages = paginatedData?.totalPages || 0

  // Get current season for waiver checks
  const currentSeason = useCurrentSeason()

  // Batch waiver check for current page
  const athleteIds = athletes.map(a => a.id)
  const { data: waiverStatus = {}, isLoading: loadingWaivers } = useBatchWaiverCheck(
    athleteIds,
    currentSeason?.id || null
  )

  // Show loading state
  if (authLoading) {
    return <InlineLoading message="Loading…" />
  }

  // Auth check ensures profile exists
  if (!profile) {
    return null
  }

  // Pagination controls
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Athletes"
        description="Manage all registered athletes"
        action={
          <Button size="sm" asChild>
            <Link href={`${basePath}/athletes/new`}>
              <Plus className="h-3.5 w-3.5" />
              Add Athlete
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-50 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">All Athletes</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{totalCount.toLocaleString()} total</p>
          </div>
          <div className="relative w-56 flex-shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <Input
              type="search"
              placeholder="Search athletes…"
              className="pl-8 h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="p-2">
          {isLoading ? (
            <InlineLoading message="Loading athletes…" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : athletes.length > 0 ? (
            <>
              <div className="space-y-0.5">
                {athletes.map((athlete) => {
                  const first = athlete.first_name || ''
                  const last = athlete.last_name || ''
                  const initials = `${first[0] || ''}${last[0] || ''}`.toUpperCase() || '?'
                  return (
                    <Link
                      key={athlete.id}
                      href={`${basePath}/athletes/${athlete.id}`}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-zinc-600">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900">
                          {first} {last}
                        </p>
                        {athlete.date_of_birth && (
                          <p className="text-xs text-zinc-500">
                            {new Date(athlete.date_of_birth).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingWaivers ? (
                          <Clock className="h-3.5 w-3.5 text-zinc-300 animate-spin" />
                        ) : currentSeason?.id ? (
                          waiverStatus[athlete.id] === true ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                              <CheckCircle className="h-3 w-3" />
                              Signed
                            </span>
                          ) : waiverStatus[athlete.id] === false ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">
                              <XCircle className="h-3 w-3" />
                              Required
                            </span>
                          ) : null
                        ) : null}
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-50 px-2">
                  <div className="text-xs text-zinc-400">
                    Showing {startIndex.toLocaleString()} to {endIndex.toLocaleString()} of {totalCount.toLocaleString()} athletes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => p - 1)}
                      disabled={!canGoPrevious}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={!canGoNext}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-zinc-400">
              {searchTerm ? `No athletes found matching "${searchTerm}"` : 'No athletes found'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
