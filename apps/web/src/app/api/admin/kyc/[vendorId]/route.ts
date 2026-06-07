import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchFromApi } from '@/lib/api-client'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
  }

  const { vendorId } = await params
  const body = await request.json()

  const result = await fetchFromApi(session.userId, `/api/v1/admin/kyc/${vendorId}`, {
    method: 'PATCH',
    body,
  })

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true, data: result.data })
}
