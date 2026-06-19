import { NextResponse } from 'next/server'
import { getMerchantLayoutConfig } from '@/lib/platform-settings'

export const revalidate = 30

/** GET /api/platform/merchant-layout */
export async function GET() {
  try {
    const config = await getMerchantLayoutConfig()
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load merchant layout'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
