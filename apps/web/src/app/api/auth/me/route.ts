import { NextResponse } from 'next/server'
import { getCurrentAuth } from '@/lib/auth'

/** GET /api/auth/me — hydrate client session from httpOnly cookie (stable across dev rebuilds). */
export async function GET() {
  const current = await getCurrentAuth()
  if (!current) {
    return NextResponse.json({ token: null, user: null }, { status: 401 })
  }
  return NextResponse.json(current)
}
