'use client'

import { useSelectedSeason, useSeason } from '@/lib/contexts/season-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Download, X, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'

interface FilterData {
  seasonId: string
  programIds?: string[]
  statuses?: string[]
  paymentStatuses?: string[]
  gender?: AnalyticsFilters['gender']
  dateRange?: string
  dateFrom?: string
  dateTo?: string
}

export interface AnalyticsFilters {
  seasonId: string
  programIds?: string[]
  subProgramIds?: string[]
  groupIds?: string[]
  ageMin?: number
  ageMax?: number
  gender?: 'male' | 'female' | 'other' | 'all'
  statuses?: string[]
  paymentStatuses?: string[]
  dateRange?: string
}

interface FilterBarProps {
  clubId: string
  onFiltersChange?: (filters: AnalyticsFilters) => void
  onExport?: () => void
  exportLabel?: string
  showAdvancedFilters?: 'hidden' | 'collapsed' | 'always'
  showSeasonDisplay?: boolean
  showDateRange?: boolean
  showGender?: boolean
}

export function AnalyticsFilterBar({
  clubId,
  onFiltersChange,
  onExport,
  exportLabel = 'Export CSV',
  showAdvancedFilters: advancedFiltersMode = 'collapsed',
  showSeasonDisplay = true,
  showDateRange = false,
  showGender = true,
}: FilterBarProps) {
  const selectedSeason = useSelectedSeason()
  const { seasons = [] } = useSeason()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Local filter state
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(advancedFiltersMode === 'always')
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPayment, setSelectedPayment] = useState<string>('all')
  const [selectedGender, setSelectedGender] = useState<string>('all')
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined)

  // Fetch programs for the dropdown
  const { data: programsData } = useQuery({
    queryKey: ['programs', clubId, selectedSeason?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        clubId,
      })
      if (selectedSeason?.id) {
        params.set('seasonId', selectedSeason.id)
      }
      const res = await fetch(`/api/admin/programs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch programs')
      return res.json()
    },
    enabled: !!clubId,
  })

  // Update URL params and notify parent when filters change
  useEffect(() => {
    if (!selectedSeason?.id) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('seasonId', selectedSeason.id)
    
    // Add other filters to URL
    if (selectedProgram && selectedProgram !== 'all') {
      params.set('programId', selectedProgram)
    } else {
      params.delete('programId')
    }
    
    if (selectedStatus && selectedStatus !== 'all') {
      params.set('status', selectedStatus)
    } else {
      params.delete('status')
    }
    
    if (selectedPayment && selectedPayment !== 'all') {
      params.set('payment', selectedPayment)
    } else {
      params.delete('payment')
    }
    
    if (selectedGender && selectedGender !== 'all') {
      params.set('gender', selectedGender)
    } else {
      params.delete('gender')
    }
    
    // Handle date range - only custom dates now
    if (customDateRange?.from) {
      params.set('dateRange', 'custom')
      params.set('dateFrom', format(customDateRange.from, 'yyyy-MM-dd'))
      if (customDateRange.to) {
        params.set('dateTo', format(customDateRange.to, 'yyyy-MM-dd'))
      } else {
        params.delete('dateTo')
      }
    } else {
      params.delete('dateRange')
      params.delete('dateFrom')
      params.delete('dateTo')
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false })

    // Notify parent of filter changes
    if (onFiltersChange) {
      const filterData: FilterData = {
        seasonId: selectedSeason.id,
        programIds: selectedProgram !== 'all' ? [selectedProgram] : undefined,
        statuses: selectedStatus !== 'all' ? [selectedStatus] : undefined,
        paymentStatuses: selectedPayment !== 'all' ? [selectedPayment] : undefined,
        gender: selectedGender !== 'all' ? (selectedGender as AnalyticsFilters['gender']) : undefined,
      }

      if (customDateRange?.from) {
        filterData.dateRange = 'custom'
        filterData.dateFrom = format(customDateRange.from, 'yyyy-MM-dd')
        if (customDateRange.to) {
          filterData.dateTo = format(customDateRange.to, 'yyyy-MM-dd')
        }
      }

      onFiltersChange(filterData)
    }

    // Count active filters
    let count = 0
    if (selectedProgram !== 'all') count++
    if (selectedStatus !== 'all') count++
    if (selectedPayment !== 'all') count++
    if (showGender && selectedGender !== 'all') count++
    if (showDateRange && customDateRange?.from) count++
    setActiveFiltersCount(count)
  }, [selectedSeason?.id, pathname, selectedProgram, selectedStatus, selectedPayment, selectedGender, customDateRange])

  const handleResetFilters = () => {
    setSelectedProgram('all')
    setSelectedStatus('all')
    setSelectedPayment('all')
    setSelectedGender('all')
    setCustomDateRange(undefined)
    if (advancedFiltersMode === 'collapsed') {
      setIsAdvancedExpanded(false)
    }
  }

  return (
    <div className="space-y-4 bg-card border rounded-lg p-4 shadow-sm">
      {/* Top Row: Season Display + Export */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Current Season - Read Only Display */}
        {showSeasonDisplay && (
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Season
            </label>
            <div className="flex items-center h-10 px-3 border rounded-md bg-card">
              <span className="text-sm font-medium">
                {selectedSeason?.name || 'No season selected'}
              </span>
              {selectedSeason?.is_current && (
                <Badge variant="default" className="ml-2 text-xs">
                  Current
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Change season using the selector in the header
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className={cn("flex items-end gap-2", showSeasonDisplay ? "ml-auto" : "ml-0")}>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Reset all filters"
            >
              <X className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}

          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={exportLabel || 'Export data'}
            >
              <Download className="h-4 w-4 mr-2" />
              {exportLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters Toggle - only show if mode is 'collapsed' */}
      {advancedFiltersMode === 'collapsed' && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
            className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={isAdvancedExpanded ? 'Hide advanced filters' : 'Show advanced filters'}
            aria-expanded={isAdvancedExpanded}
          >
            <Filter className="h-3 w-3 mr-2" />
            {isAdvancedExpanded ? 'Hide' : 'Show'} Advanced Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {advancedFiltersMode !== 'hidden' && (advancedFiltersMode === 'always' || isAdvancedExpanded) && (
        <div className="pt-4 border-t space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Date Range Filter - Conditional */}
            {showDateRange && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Date Range
                </label>
                <DateRangePicker
                  date={customDateRange}
                  onDateChange={setCustomDateRange}
                  onApply={(range) => {
                    setCustomDateRange(range)
                  }}
                />
              </div>
            )}

            {/* Program Filter */}
            <div>
              <label htmlFor="program-filter" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Program
              </label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="h-9" id="program-filter" aria-label="Filter by program">
                  <SelectValue placeholder="All programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All programs</SelectItem>
                  {programsData?.programs?.map((program: { id: string; name: string }) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9" id="status-filter" aria-label="Filter by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label htmlFor="payment-filter" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Payment
              </label>
              <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                <SelectTrigger className="h-9" id="payment-filter" aria-label="Filter by payment method">
                  <SelectValue placeholder="All payments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender Filter - Conditional */}
            {showGender && (
              <div>
                <label htmlFor="gender-filter" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Gender
                </label>
                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger className="h-9" id="gender-filter" aria-label="Filter by gender">
                    <SelectValue placeholder="All genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genders</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
