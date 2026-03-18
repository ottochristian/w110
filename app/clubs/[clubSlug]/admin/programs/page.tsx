'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ProgramStatus } from '@/lib/programStatus'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Zap, AlertTriangle, Search } from 'lucide-react'
import { useRequireAdmin } from '@/lib/auth-context'
import { useSelectedSeason } from '@/lib/contexts/season-context'
import { useProgramsPaginated } from '@/lib/hooks/use-programs-paginated'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { AdminPageHeader } from '@/components/admin-page-header'
import { InlineLoading, ErrorState } from '@/components/ui/loading-states'

type Program = {
  id: string
  name: string
  description?: string | null
  status: ProgramStatus | null
}

type SubProgram = {
  id: string
  name: string
  description?: string | null
  status: ProgramStatus
  program_id: string
}

type ProgramWithSubPrograms = Program & {
  sub_programs: SubProgram[]
}

export default function ProgramsPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const params = useParams()
  const clubSlug = params.clubSlug as string
  const { profile, loading: authLoading } = useRequireAdmin()
  const selectedSeason = useSelectedSeason()
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingSubProgramId, setDeletingSubProgramId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [programToDelete, setProgramToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteCounts, setDeleteCounts] = useState<{
    athletes: number
    coaches: number
    subPrograms: number
    groups: number
  } | null>(null)
  const [loadingCounts, setLoadingCounts] = useState(false)

  // Fetch paginated programs with search
  const {
    data: paginatedData,
    isLoading,
    refetch,
    error,
  } = useProgramsPaginated(selectedSeason?.id, {
    page,
    pageSize,
    search,
  })

  // Extract programs from paginated data
  const programs = (paginatedData?.data || []) as unknown as ProgramWithSubPrograms[]

  async function handleDeleteClick(programId: string) {
    const program = programs.find(p => p.id === programId)
    if (!program) return

    setProgramToDelete({ id: programId, name: program.name })
    setDeleteConfirmText('')
    setLoadingCounts(true)
    setDeleteDialogOpen(true)

    // Fetch counts of athletes, coaches, sub-programs, and groups
    try {
      const [athletesResult, coachesResult, subProgramsResult, groupsResult] = await Promise.all([
        // Count athletes with registrations for this program's sub-programs
        supabase
          .from('registrations')
          .select('athlete_id', { count: 'exact', head: true })
          .in('sub_program_id', program.sub_programs?.map(sp => sp.id) || [])
          .eq('season_id', selectedSeason?.id || '')
          .is('deleted_at', null),
        
        // Count coaches assigned to this program's sub-programs
        supabase
          .from('coach_assignments')
          .select('coach_id', { count: 'exact', head: true })
          .in('sub_program_id', program.sub_programs?.map(sp => sp.id) || [])
          .eq('season_id', selectedSeason?.id || ''),
        
        // Count sub-programs
        supabase
          .from('sub_programs')
          .select('id', { count: 'exact', head: true })
          .eq('program_id', programId)
          .is('deleted_at', null),
        
        // Count groups
        supabase
          .from('groups')
          .select('id', { count: 'exact', head: true })
          .in('sub_program_id', program.sub_programs?.map(sp => sp.id) || [])
          .is('deleted_at', null),
      ])

      setDeleteCounts({
        athletes: athletesResult.count || 0,
        coaches: coachesResult.count || 0,
        subPrograms: subProgramsResult.count || 0,
        groups: groupsResult.count || 0,
      })
    } catch (error) {
      console.error('Error fetching delete counts:', error)
      setDeleteCounts({ athletes: 0, coaches: 0, subPrograms: 0, groups: 0 })
    } finally {
      setLoadingCounts(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!programToDelete || deleteConfirmText !== 'DELETE') return

    setDeletingId(programToDelete.id)
    setDeleteDialogOpen(false)

    const { error } = await supabase.rpc('soft_delete_program', {
      program_id: programToDelete.id,
    })

    if (error) {
      console.error('Error soft deleting program:', error)
      alert(`Error deleting program: ${error.message}`)
    } else {
      // Refetch programs list immediately to show updated data
      await refetch()
    }

    setDeletingId(null)
    setProgramToDelete(null)
    setDeleteConfirmText('')
    setDeleteCounts(null)
  }

  async function handleDeleteSubProgram(subProgramId: string, programId: string) {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this sub-program? This will also delete all its groups. You cannot undo this from the UI.'
    )

    if (!confirmDelete) return

    setDeletingSubProgramId(subProgramId)

    const { error } = await supabase.rpc('soft_delete_sub_program', {
      sub_program_id: subProgramId,
    })

    if (error) {
      console.error('Error soft deleting sub-program:', error)
      alert(`Error deleting sub-program: ${error.message}`)
    } else {
      // Refetch programs list immediately to show updated data
      await refetch()
    }

    setDeletingSubProgramId(null)
  }

  async function handleActivateAll(programId: string) {
    const program = programs.find(p => p.id === programId)
    if (!program) return

    const confirmActivate = window.confirm(
      `Activate "${program.name}" and all its sub-programs and groups?\n\nThis will set the program, all sub-programs, and all groups to ACTIVE status.`
    )

    if (!confirmActivate) return

    setActivatingId(programId)

    try {
      // Get all sub-program IDs for this program
      const subProgramIds = (program.sub_programs || []).map(sp => sp.id)

      if (subProgramIds.length === 0) {
        alert('No sub-programs found for this program.')
        setActivatingId(null)
        return
      }

      // 1. Activate the parent program first
      const { error: programError } = await supabase
        .from('programs')
        .update({ status: ProgramStatus.ACTIVE })
        .eq('id', programId)

      if (programError) {
        console.error('Error activating program:', programError)
        alert(`Error activating program: ${programError.message}`)
        setActivatingId(null)
        return
      }

      // 2. Activate all sub-programs
      const { error: subProgramError } = await supabase
        .from('sub_programs')
        .update({ status: ProgramStatus.ACTIVE })
        .eq('program_id', programId)

      if (subProgramError) {
        console.error('Error activating sub-programs:', subProgramError)
        alert(`Error activating sub-programs: ${subProgramError.message}`)
        setActivatingId(null)
        return
      }

      // 2. Activate all groups for these sub-programs
      const { error: groupsError } = await supabase
        .from('groups')
        .update({ status: ProgramStatus.ACTIVE })
        .in('sub_program_id', subProgramIds)

      if (groupsError) {
        console.error('Error activating groups:', groupsError)
        alert(`Error activating groups: ${groupsError.message}`)
      } else {
        alert(`✅ "${program.name}" and all its sub-programs and groups are now ACTIVE!`)
      }

      // Refetch programs list immediately to show updated status
      await refetch()
    } catch (err) {
      console.error('Error activating program contents:', err)
      alert('An unexpected error occurred.')
    }

    setActivatingId(null)
  }

  // Show loading state
  if (authLoading || isLoading) {
    return <InlineLoading message="Loading programs…" />
  }

  // Show error state
  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />
  }

  // Auth check ensures profile exists, but TypeScript needs this
  if (!profile) {
    return null
  }

  // Base path for club-aware routes
  const basePath = `/clubs/${clubSlug}/admin`

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Programs"
        description="Manage all ski programs for this season."
        action={
          <Button size="sm" asChild>
            <Link href={`${basePath}/programs/new`}>
              <Plus className="h-3.5 w-3.5" />
              Add Program
            </Link>
          </Button>
        }
      />


      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Programs</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {selectedSeason?.name || 'Selected season'}
            </p>
          </div>
          <div className="relative w-56 flex-shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search programs…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
        {programs.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-400">
            No programs yet. Click "Add Program" to create one.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {programs.map((program) => (
              <div key={program.id} className="group/program">

                {/* Program row */}
                <div className="flex items-start gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors">
                  <div className="flex-1 min-w-0 pt-px">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{program.name}</span>
                      {program.status === ProgramStatus.INACTIVE && (
                        <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-secondary text-muted-foreground ring-1 ring-inset ring-border uppercase tracking-wide">
                          Inactive
                        </span>
                      )}
                    </div>
                    {program.description && (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">{program.description}</p>
                    )}
                  </div>
                  {/* Program actions — always visible */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Link href={`${basePath}/programs/${program.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Link href={`${basePath}/programs/${program.id}/sub-programs/new`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/50" title="Add sub-program">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-950/30"
                      onClick={() => handleActivateAll(program.id)}
                      disabled={activatingId === program.id}
                      title="Activate all sub-programs and groups"
                    >
                      <Zap className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-950/20"
                      onClick={() => handleDeleteClick(program.id)}
                      disabled={deletingId === program.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Sub-programs — indented with left accent line */}
                <div className="px-5 pb-3">
                  <div className="ml-4 pl-4 border-l-2 border-border">
                    {program.sub_programs && program.sub_programs.length > 0 ? (
                      <div className="space-y-px">
                        {program.sub_programs.map(subProgram => (
                          <div
                            key={subProgram.id}
                            className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors group/sub"
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-sm text-foreground">{subProgram.name}</span>
                              {subProgram.status === ProgramStatus.INACTIVE && (
                                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-secondary text-muted-foreground ring-1 ring-inset ring-border uppercase tracking-wide flex-shrink-0">
                                  Inactive
                                </span>
                              )}
                              {subProgram.description && (
                                <span className="text-xs text-zinc-400 truncate hidden lg:inline">{subProgram.description}</span>
                              )}
                            </div>
                            {/* Sub-program actions — appear on hover */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity flex-shrink-0">
                              <Link href={`${basePath}/sub-programs/${subProgram.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Link href={`${basePath}/sub-programs/${subProgram.id}/groups/new`}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-secondary/50" title="Add group">
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-950/20"
                                onClick={() => handleDeleteSubProgram(subProgram.id, program.id)}
                                disabled={deletingSubProgramId === subProgram.id}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {/* Add sub-program inline link */}
                        <Link
                          href={`${basePath}/programs/${program.id}/sub-programs/new`}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-orange-500 transition-colors rounded-lg hover:bg-secondary/50"
                        >
                          <Plus className="h-3 w-3" />
                          Add sub-program
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`${basePath}/programs/${program.id}/sub-programs/new`}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-orange-500 transition-colors rounded-lg hover:bg-secondary/50"
                      >
                        <Plus className="h-3 w-3" />
                        Add sub-program
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Program
            </DialogTitle>
            <DialogDescription>
              You are about to delete <strong>{programToDelete?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {loadingCounts ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full" />
              </div>
            ) : deleteCounts && (
              <>
                <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-md p-4">
                  <p className="text-sm font-semibold text-yellow-400 mb-2">
                    ⚠️ This action will affect:
                  </p>
                  <ul className="text-sm text-yellow-300 space-y-1">
                    <li>• {deleteCounts.subPrograms} sub-program(s)</li>
                    <li>• {deleteCounts.groups} group(s)</li>
                    <li>• {deleteCounts.athletes} athlete registration(s)</li>
                    <li>• {deleteCounts.coaches} coach assignment(s)</li>
                  </ul>
                </div>

                <div className="bg-red-950/20 border border-red-800/40 rounded-md p-4">
                  <p className="text-sm font-semibold text-red-400 mb-2">
                    🚨 Soft Delete: Data remains in database
                  </p>
                  <p className="text-sm text-red-300">
                    This program will be hidden from the admin portal but data remains in the database for audit/recovery purposes. 
                    All relationships with athletes, coaches, sub-programs, and groups will be preserved.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Type DELETE"
                    autoFocus
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setProgramToDelete(null)
                setDeleteConfirmText('')
                setDeleteCounts(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmText !== 'DELETE' || loadingCounts}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


