import { NextResponse } from 'next/server'
import { getHomeFeedConfig } from '@/lib/platform-settings'

export const revalidate = 30

/** GET /api/platform/home-feed — public home feed CMS config */
export async function GET() {
  try {
    const config = await getHomeFeedConfig()
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load home feed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
