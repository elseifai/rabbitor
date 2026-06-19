import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getHomeFeedConfig, updateHomeFeedConfig } from '@/lib/platform-settings'
import type { HomeFeedConfig } from '@/lib/home-feed-config'

/** GET /api/admin/home-feed */
export async function GET() {
  try {
    await requireSession(['ADMIN'])
    const config = await getHomeFeedConfig()
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Access denied'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }
}

/** PUT /api/admin/home-feed */
export async function PUT(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const body = (await request.json()) as Partial<HomeFeedConfig>
    const config = await updateHomeFeedConfig(body)
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update home feed'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
