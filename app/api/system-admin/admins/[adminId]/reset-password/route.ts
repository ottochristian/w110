import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'

/**
 * Reset password for an admin
 * 
 * POST /api/system-admin/admins/[adminId]/reset-password
 * 
 * Requires: System admin authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { adminId: string } }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { profile } = authResult

  // Only system admins can reset passwords
  if (profile.role !== 'system_admin') {
    return NextResponse.json(
      { error: 'Forbidden: System admin access required' },
      { status: 403 }
    )
  }

  const supabase = createAdminClient()

  try {
    const { adminId } = params
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Generate password reset link
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${email}`
    })

  } catch (error: any) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}
