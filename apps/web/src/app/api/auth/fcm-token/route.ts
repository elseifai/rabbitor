import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchFromApi } from '@/lib/api-client'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
  }

  const body = await request.json()
  const result = await fetchFromApi(session.userId, '/api/v1/auth/fcm-token', {
    method: 'POST',
    body,
  })

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true, data: result.data })
}
