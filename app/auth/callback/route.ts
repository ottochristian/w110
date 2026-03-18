import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // If a specific redirect was requested (e.g. invitation acceptance), honour it
  if (next) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Role-based redirect
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // New OAuth user with no profile yet — send to a completion page
    return NextResponse.redirect(`${origin}/complete-profile`)
  }

  if (profile.role === 'system_admin') {
    return NextResponse.redirect(`${origin}/system-admin`)
  }

  if (profile.role === 'coach') {
    return NextResponse.redirect(`${origin}/coach`)
  }

  if (profile.club_id) {
    // Resolve slug from club_id
    const { data: club } = await supabase
      .from('clubs')
      .select('slug')
      .eq('id', profile.club_id)
      .single()

    if (club?.slug) {
      if (profile.role === 'admin') {
        return NextResponse.redirect(`${origin}/clubs/${club.slug}/admin`)
      }
      if (profile.role === 'parent') {
        return NextResponse.redirect(`${origin}/clubs/${club.slug}/parent/dashboard`)
      }
    }
  }

  // Fallback
  return NextResponse.redirect(`${origin}/login`)
}
