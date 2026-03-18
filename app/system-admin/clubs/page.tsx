'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSystemAdmin } from '@/lib/use-system-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Building2, Plus, Eye, Edit } from 'lucide-react'
import Link from 'next/link'
import { colors } from '@/lib/colors'

type Club = {
  id: string
  name: string
  slug: string
  primary_color: string | null
  created_at: string
  admin_count?: number
  athlete_count?: number
  program_count?: number
}

export default function ClubsPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useSystemAdmin()
  const [loading, setLoading] = useState(true)
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadClubs() {
      if (authLoading) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/system-admin/clubs', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `Failed to fetch: ${response.status}`)
        }

        const data = await response.json()
        setClubs(data.clubs)
      } catch (err) {
        console.error('Error loading clubs:', err)
        setError(err instanceof Error ? err.message : 'Failed to load clubs')
      } finally {
        setLoading(false)
      }
    }

    loadClubs()
  }, [authLoading])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-400">Loading clubs...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Clubs</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Manage all clubs in the system</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/system-admin/clubs/new">
            <Plus className="h-3.5 w-3.5" />
            Create Club
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-foreground">All Clubs</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{clubs.length} clubs registered</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Admins</TableHead>
                <TableHead>Athletes</TableHead>
                <TableHead>Programs</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-zinc-400">
                    No clubs found
                  </TableCell>
                </TableRow>
              ) : (
                clubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: club.primary_color || colors.primary,
                          }}
                        />
                        {club.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{club.slug}</TableCell>
                    <TableCell>{club.admin_count || 0}</TableCell>
                    <TableCell>{club.athlete_count || 0}</TableCell>
                    <TableCell>{club.program_count || 0}</TableCell>
                    <TableCell>
                      {new Date(club.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/system-admin/clubs/${club.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/system-admin/clubs/${club.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
