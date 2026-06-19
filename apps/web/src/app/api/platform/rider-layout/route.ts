import { NextResponse } from 'next/server'
import { getRiderLayoutConfig } from '@/lib/platform-settings'

export const revalidate = 30

/** GET /api/platform/rider-layout */
export async function GET() {
  try {
    const config = await getRiderLayoutConfig()
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load rider layout'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
