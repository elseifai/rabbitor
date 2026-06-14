import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import {
  getPlatformSettings,
  updatePlatformSettings,
} from '@/lib/platform-settings'

/** GET /api/admin/platform-settings */
export async function GET() {
  try {
    await requireSession(['ADMIN'])
    const settings = await getPlatformSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Access denied'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }
}

/** PUT /api/admin/platform-settings */
export async function PUT(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const body = (await request.json()) as {
      globalMinCartValue?: number
      multiShopRoutingFeePerLeg?: number
      freeDeliveryThreshold?: number
    }

    const settings = await updatePlatformSettings({
      ...(body.globalMinCartValue != null && {
        globalMinCartValue: Math.max(0, body.globalMinCartValue),
      }),
      ...(body.multiShopRoutingFeePerLeg != null && {
        multiShopRoutingFeePerLeg: Math.max(0, body.multiShopRoutingFeePerLeg),
      }),
      ...(body.freeDeliveryThreshold != null && {
        freeDeliveryThreshold: Math.max(0, body.freeDeliveryThreshold),
      }),
    })

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update settings'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
