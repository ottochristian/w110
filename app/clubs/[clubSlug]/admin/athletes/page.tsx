'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
      <div className="flex items-center justify-between">
        <AdminPageHeader
          title="Athletes"
          description="Manage all registered athletes"
        />
        <Link href={`${basePath}/athletes/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Athlete
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Athletes</CardTitle>
              <CardDescription>
                {totalCount.toLocaleString()} total athletes
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search athletes..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <InlineLoading message="Loading athletes…" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : athletes.length > 0 ? (
            <>
              <div className="space-y-4">
                {athletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">
                          {athlete.first_name} {athlete.last_name}
                        </p>
                      </div>
                      {athlete.date_of_birth && (
                        <p className="text-sm text-muted-foreground mb-2">
                          DOB: {new Date(athlete.date_of_birth).toLocaleDateString()}
                        </p>
                      )}
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {/* Waiver Compliance Tag */}
                        {loadingWaivers ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            <Clock className="h-3 w-3 animate-spin" />
                            Checking...
                          </span>
                        ) : currentSeason?.id ? (
                          waiverStatus[athlete.id] === true ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              <CheckCircle className="h-3 w-3" />
                              Waivers Signed
                            </span>
                          ) : waiverStatus[athlete.id] === false ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              <XCircle className="h-3 w-3" />
                              Waivers Required
                            </span>
                          ) : null
                        ) : null}
                      </div>
                    </div>
                    <Link href={`${basePath}/athletes/${athlete.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
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
            <p className="py-8 text-center text-sm text-muted-foreground">
              {searchTerm ? `No athletes found matching "${searchTerm}"` : 'No athletes found'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
