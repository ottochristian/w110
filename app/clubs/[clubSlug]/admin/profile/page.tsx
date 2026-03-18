'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRequireAdmin } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/image-upload'
import { AdminPageHeader } from '@/components/admin-page-header'
import { useToast } from '@/components/ui/use-toast'
import { InlineLoading, ErrorState } from '@/components/ui/loading-states'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  master_admin: 'Master Admin',
  system_admin: 'System Admin',
  coach: 'Coach',
  parent: 'Parent',
}

interface ProfileData {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  role: string
}

export default function AdminProfilePage() {
  const router = useRouter()
  const params = useParams()
  const clubSlug = params.clubSlug as string
  const [supabase] = useState(() => createClient())
  const { profile: authProfile, loading: authLoading } = useRequireAdmin()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    avatarUrl: '',
  })

  useEffect(() => {
    async function loadProfile() {
      if (authLoading) return

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authProfile?.id || '')
          .single()

        if (profileError) {
          setError('Failed to load profile')
          setLoading(false)
          return
        }

        setProfile(profileData as ProfileData)
        setFormData({
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          email: profileData.email || '',
          bio: profileData.bio || '',
          avatarUrl: profileData.avatar_url || '',
        })
        setLoading(false)
      } catch (err) {
        console.error('Error loading profile:', err)
        setError('Failed to load profile')
        setLoading(false)
      }
    }

    loadProfile()
  }, [authLoading, authProfile])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!formData.firstName || !formData.lastName) {
      setError('First name and last name are required')
      setSaving(false)
      return
    }

    try {
      if (!profile) {
        setError('Profile not loaded')
        setSaving(false)
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          avatar_url: formData.avatarUrl || null,
          bio: formData.bio || null,
        })
        .eq('id', profile.id)

      if (profileError) throw profileError

      toast({ title: 'Profile updated', description: 'Your changes have been saved.' })
      router.refresh()
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) return <InlineLoading message="Loading profile…" />
  if (error && !profile) return <ErrorState error={error} onRetry={() => router.refresh()} />
  if (!authProfile || !profile) return null

  const displayName = [formData.firstName, formData.lastName].filter(Boolean).join(' ') || profile.email
  const initials = [formData.firstName[0], formData.lastName[0]].filter(Boolean).join('').toUpperCase() || '?'
  const roleLabel = ROLE_LABELS[profile.role] ?? profile.role

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Profile Settings"
        description="Manage your personal information and profile"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — avatar card */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            {/* Avatar display */}
            <div className="relative">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={displayName}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-secondary ring-2 ring-border flex items-center justify-center">
                  <span className="text-2xl font-semibold text-muted-foreground">{initials}</span>
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="font-semibold text-foreground">{displayName}</p>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary mt-1">
                {roleLabel}
              </span>
              <p className="text-xs text-muted-foreground mt-1.5 break-all">{profile.email}</p>
            </div>

            {/* Upload — no wrapper label since ImageUpload renders its own */}
            <div className="w-full border-t border-border pt-4">
              <ImageUpload
                value={formData.avatarUrl}
                onChange={(url) => setFormData({ ...formData, avatarUrl: url || '' })}
                bucket="profile-images"
                folder="avatars"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right — edit form */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Personal information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="card-title">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      className={cn(!formData.firstName && 'border-destructive')}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      className={cn(!formData.lastName && 'border-destructive')}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed here. Contact support to update your email.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bio */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="card-title">About</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="A short introduction about yourself…"
                    rows={4}
                    maxLength={500}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.bio.length} / 500
                  </p>
                </div>
              </CardContent>
            </Card>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
