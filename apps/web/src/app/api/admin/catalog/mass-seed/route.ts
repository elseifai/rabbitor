import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchFromApi } from '@/lib/api-client'

type MassSeedResult = {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
  bySector: Record<string, number>
}

/** Trigger the API hyper-scale mass catalog seed (admin-only). */
export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
  }

  const result = await fetchFromApi<MassSeedResult>(session.userId, '/api/v1/admin/catalog/mass-seed', {
    method: 'POST',
  })

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true, data: result.data })
}
