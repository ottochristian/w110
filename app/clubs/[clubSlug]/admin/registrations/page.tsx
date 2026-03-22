'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { DollarSign, FileText, CreditCard } from 'lucide-react'
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

function statusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'confirmed': case 'paid':    return 'bg-emerald-950/30 text-emerald-400 ring-emerald-800/40'
    case 'pending': case 'unpaid':    return 'bg-amber-950/30 text-amber-400 ring-amber-800/40'
    case 'waitlisted':                return 'bg-secondary text-muted-foreground ring-border'
    case 'cancelled': case 'failed':  return 'bg-red-950/30 text-red-400 ring-red-800/40'
    default:                          return 'bg-secondary text-muted-foreground ring-border'
  }
}

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
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">No Season Selected</p>
          <p className="text-sm text-muted-foreground">Please select a season to view registrations.</p>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-secondary rounded-xl overflow-hidden ring-1 ring-border">
          <div className="bg-card px-5 py-5">
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Revenue</span>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            </div>
            <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              ${summary.payments.paidAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Net ${summary.netRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-card px-5 py-5">
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Registrations</span>
              <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            </div>
            <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {summary.totals.registrations}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {summary.status.confirmed} confirmed · {summary.status.pending} pending · {summary.status.waitlisted} waitlist
            </p>
          </div>
          <div className="bg-card px-5 py-5">
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Payments</span>
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            </div>
            <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {summary.payments.paidCount}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              paid · {summary.payments.unpaidCount} unpaid · ${summary.payments.pendingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">All Registrations</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedSeason.name}</p>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search athletes…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {registrations.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No registrations found for this season
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Parent Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
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
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize ${statusStyle(reg.status)}`}>
                          {reg.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize ${statusStyle(reg.payment_status)}`}>
                          {reg.payment_status}
                        </span>
                      </TableCell>
                      <TableCell>${Number(reg.amount_paid || 0).toFixed(2)}</TableCell>
                      <TableCell>{new Date(reg.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {registrations.map((reg) => (
                <div key={reg.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {reg.athlete?.first_name} {reg.athlete?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {reg.program?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {reg.parent?.email || 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize ${statusStyle(reg.status)}`}>
                      {reg.status}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize ${statusStyle(reg.payment_status)}`}>
                      {reg.payment_status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ${Number(reg.amount_paid || 0).toFixed(2)} · {new Date(reg.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination controls */}
        {paginatedData && paginatedData.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-border">
            <PaginationControls
              currentPage={paginatedData.page}
              totalPages={paginatedData.totalPages}
              pageSize={pageSize}
              totalItems={paginatedData.total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  )
}

