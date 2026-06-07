import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchFromApi } from '@/lib/api-client'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') ?? '1'
  const limit = searchParams.get('limit') ?? '20'

  const result = await fetchFromApi<{
    orders: Array<{
      id: string
      orderNumber: string
      storeName: string
      status: string
      totalPrice: number
      paymentStatus: string
      createdAt: string
    }>
    page: number
    limit: number
    total: number
  }>(session.userId, '/api/v1/orders', {
    searchParams: { page, limit },
  })

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true, data: result.data })
}
