'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useRequireAdmin } from '@/lib/auth-context'
import { useSelectedSeason } from '@/lib/contexts/season-context'
import { useRegistrationSummary } from '@/lib/hooks/use-registrations'
import { useRegistrationsPaginated } from '@/lib/hooks/use-registrations-paginated'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { AdminPageHeader } from '@/components/admin-page-header'
import { InlineLoading, ErrorState } from '@/components/ui/loading-states'
import { Search } from 'lucide-react'

interface Registration {
  id: string
  athlete_id: string
  program_id: string
  parent_id: string
  status: string
  payment_status: string
  amount_paid: number
  created_at: string
  athlete?: {
    id: string
    first_name?: string
    last_name?: string
    date_of_birth?: string
  }
  program?: {
    id: string
    name: string
  }
  parent?: {
    id: string
    email: string
  }
}

export default function RegistrationsPage() {
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const { profile, loading: authLoading } = useRequireAdmin()
  const selectedSeason = useSelectedSeason()
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')

  // Fetch paginated data with search and filters
  const {
    data: paginatedData,
    isLoading,
    error,
    refetch,
  } = useRegistrationsPaginated(selectedSeason?.id, {
    page,
    pageSize,
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
    paymentStatus: paymentFilter === 'all' ? undefined : paymentFilter,
  })

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useRegistrationSummary(selectedSeason?.id, profile?.club_id || undefined)

  // Extract registrations from paginated data
  const registrations: Registration[] = (paginatedData?.data || []).map((reg: any) => {
    // Get parent email from nested household data
    const parentEmail = reg.athletes?.households?.household_guardians?.[0]?.profiles?.email || null

    return {
      ...reg,
      athlete: {
        id: reg.athletes?.id,
        first_name: reg.athletes?.first_name,
        last_name: reg.athletes?.last_name,
        date_of_birth: reg.athletes?.date_of_birth,
      },
      program: reg.sub_programs?.programs || { name: reg.sub_programs?.name || 'Unknown' },
      parent: parentEmail ? { email: parentEmail } : null,
    }
  })

  // Show loading state
  if (authLoading || isLoading || summaryLoading) {
    return <InlineLoading message="Loading registrations…" />
  }

  // Show error state
  if (error || summaryError) {
    return (
      <ErrorState
        error={error || summaryError}
        onRetry={() => {
          refetch()
          refetchSummary()
        }}
      />
    )
  }

  // Show message if no season exists
  if (!selectedSeason) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Season Selected</CardTitle>
            <CardDescription>
              Please select a season to view registrations.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Auth check ensures profile exists
  if (!profile) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Registrations"
        description={`All registrations for ${selectedSeason.name}`}
      />

      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-2xl">
                ${summary.payments.paidAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Net: ${summary.netRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Registrations</CardDescription>
              <CardTitle className="text-2xl">{summary.totals.registrations}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Confirmed {summary.status.confirmed} · Pending {summary.status.pending} · Waitlist {summary.status.waitlisted}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Payments</CardDescription>
              <CardTitle className="text-2xl">
                Paid {summary.payments.paidCount} · Unpaid {summary.payments.unpaidCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Pending amount ${summary.payments.pendingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Registrations</CardTitle>
          <CardDescription>
            Complete list of registrations for the selected season
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and filters */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search athlete names..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-8"
              />
            </div>
          </div>

          {registrations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Parent Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      {reg.athlete?.first_name} {reg.athlete?.last_name}
                      {reg.athlete?.date_of_birth && (
                        <div className="text-xs text-muted-foreground">
                          DOB: {new Date(reg.athlete.date_of_birth).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{reg.program?.name || 'Unknown'}</TableCell>
                    <TableCell>{reg.parent?.email || 'N/A'}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium capitalize text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {reg.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium capitalize text-green-800 dark:bg-green-900 dark:text-green-200">
                        {reg.payment_status}
                      </span>
                    </TableCell>
                    <TableCell>${Number(reg.amount_paid || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(reg.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No registrations found for this season
            </p>
          )}

          {/* Pagination controls */}
          {paginatedData && paginatedData.totalPages > 1 && (
            <PaginationControls
              currentPage={paginatedData.page}
              totalPages={paginatedData.totalPages}
              pageSize={pageSize}
              totalItems={paginatedData.total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

