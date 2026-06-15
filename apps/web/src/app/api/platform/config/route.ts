import { NextResponse } from 'next/server'
import { getRuntimePlatformConfig } from '@/lib/platform-config'

/** Public runtime config for customer, merchant, and rider apps. */
export async function GET() {
  const config = await getRuntimePlatformConfig()
  return NextResponse.json(
    { success: true, data: config },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
  )
}
