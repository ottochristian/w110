'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { useRequireAdmin } from '@/lib/auth-context'
import { useSeason } from '@/lib/hooks/use-season'
import {
  useRegistrations,
  useRegistrationSummary,
} from '@/lib/hooks/use-registrations'
import { AdminPageHeader } from '@/components/admin-page-header'
import { InlineLoading, ErrorState } from '@/components/ui/loading-states'

interface Registration {
  id: string
  athlete_id?: string
  program_id?: string
  parent_id?: string
  status: string
  payment_status: string
  amount_paid: number
  created_at: string
  athlete?: {
    id?: string
    first_name?: string
    last_name?: string
    date_of_birth?: string
  }
  program?: {
    id?: string
    name?: string
  }
  parent?: {
    id?: string
    email: string
  } | null
}

export default function RegistrationsPage() {
  const [supabase] = useState(() => createClient())
  const { profile, loading: authLoading } = useRequireAdmin()
  const { selectedSeason, loading: seasonLoading } = useSeason()
  const [parentEmailMap, setParentEmailMap] = useState<Map<string, string>>(new Map())

  // PHASE 2: RLS handles club filtering automatically - no clubQuery needed!
  const {
    data: registrationsData = [],
    isLoading,
    error,
    refetch,
  } = useRegistrations(selectedSeason?.id)

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useRegistrationSummary(selectedSeason?.id, profile?.club_id || undefined)

  // Load parent emails when registrations change
  // Use a stable key based on registration IDs to avoid infinite loops
  const registrationsKey = registrationsData.map((r: { id: string }) => r.id).join(',')
  
  useEffect(() => {
    async function loadParentEmails() {
      if (registrationsData.length === 0) {
        // Only update if map is not empty to avoid unnecessary re-renders
        setParentEmailMap((prev) => {
          if (prev.size === 0) return prev
          return new Map()
        })
        return
      }

      // Extract unique household_ids
      const householdIds = new Set<string>()
      registrationsData.forEach((reg: { athletes?: { household_id?: string } }) => {
        if (reg.athletes?.household_id) {
          householdIds.add(reg.athletes.household_id)
        }
      })

      const emailMap = new Map<string, string>()

      // Fetch parent emails for households via household_guardians -> profiles
      if (householdIds.size > 0) {
        const { data: householdGuardians } = await supabase
          .from('household_guardians')
          .select('household_id, profiles:user_id(email)')
          .in('household_id', Array.from(householdIds))

        if (householdGuardians) {
          householdGuardians.forEach((hg: { household_id?: string; profiles?: { email?: string } | { email?: string }[] }) => {
            const profile = Array.isArray(hg.profiles) ? hg.profiles[0] : hg.profiles
            if (hg.household_id && profile?.email) {
              emailMap.set(hg.household_id, profile.email)
            }
          })
        }
      }

      setParentEmailMap(emailMap)
    }

    loadParentEmails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationsKey])

  // Transform data to match our interface and add parent emails
  interface RegistrationRow {
    id: string
    status: string
    payment_status: string
    amount_paid: number
    created_at: string
    athletes?: { id?: string; first_name?: string; last_name?: string; date_of_birth?: string; household_id?: string }
    sub_programs?: { programs?: { id?: string; name?: string }; name?: string }
    program_id?: string
    parent_id?: string
    athlete_id?: string
  }
  const registrations: Registration[] = (registrationsData as RegistrationRow[]).map((reg) => {
    const athlete = reg.athletes
    const householdId = athlete?.household_id
    const parentEmail = householdId ? parentEmailMap.get(householdId) || null : null

    return {
      ...reg,
      athlete: {
        id: athlete?.id,
        first_name: athlete?.first_name,
        last_name: athlete?.last_name,
        date_of_birth: athlete?.date_of_birth,
      },
      program: reg.sub_programs?.programs || { name: reg.sub_programs?.name || 'Unknown' },
      parent: parentEmail ? { email: parentEmail } : null,
    }
  })

  // Show loading state
  if (authLoading || seasonLoading || isLoading || summaryLoading) {
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
        </CardContent>
      </Card>
    </div>
  )
}
