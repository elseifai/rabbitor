import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchFromApi } from '@/lib/api-client'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
  }

  const result = await fetchFromApi<
    Array<{
      vendorId: string
      businessName: string
      kycStatus: string
      user: { id: string; phone: string; displayName: string | null; name: string }
      shops: Array<{ id: string; name: string; slug: string }>
      documents: Array<{
        id: string
        docType: string
        fileUrl: string
        status: string
        createdAt: string
      }>
    }>
  >(session.userId, '/api/v1/admin/kyc')

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true, data: result.data })
}
