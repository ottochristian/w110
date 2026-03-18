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
  { params }: { params: Promise<{ adminId: string }> }
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
    const { adminId } = await params

    // Look up the admin's actual email from auth.users using adminId.
    // Never trust an email from the request body — that would allow resetting arbitrary accounts.
    const { data: { user: adminUser }, error: lookupError } = await supabase.auth.admin.getUserById(adminId)

    if (lookupError || !adminUser?.email) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Generate password reset link using the verified email
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: adminUser.email,
    })

    if (resetError) {
      console.error('Error generating reset link:', resetError)
      return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${adminUser.email}`,
    })

  } catch (error: any) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
