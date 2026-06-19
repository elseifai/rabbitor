import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchFromApi } from '@/lib/api-client'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
  }

  const result = await fetchFromApi<{
    totalItems: number
    shopMappings: number
    categoryBreakdown: Array<{ category: string; count: number }>
    storeTypeBreakdown: Array<{ storeType: string; count: number }>
  }>(session.userId, '/api/v1/admin/catalog/stats', { method: 'GET' })

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true, data: result.data })
}
