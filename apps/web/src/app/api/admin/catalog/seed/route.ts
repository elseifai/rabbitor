import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchFromApi } from '@/lib/api-client'

type SeedResult = {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
  bySector: Record<string, number>
  entries: Array<{ name: string; sku: string; action: 'created' | 'updated' | 'skipped' }>
}

/** Trigger the API global catalog seed engine (admin-only). */
export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
  }

  const result = await fetchFromApi<SeedResult>(session.userId, '/api/v1/admin/catalog/seed', {
    method: 'POST',
  })

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true, data: result.data })
}
