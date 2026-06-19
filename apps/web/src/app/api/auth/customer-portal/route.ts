import { NextResponse } from 'next/server'
import { switchToCustomerPortal } from '@/lib/auth'

/** POST /api/auth/customer-portal — switch active portal to customer for checkout. */
export async function POST() {
  const auth = await switchToCustomerPortal()
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    data: { token: auth.token, user: auth.user },
  })
}
