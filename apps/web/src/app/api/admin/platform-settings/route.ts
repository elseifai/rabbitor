import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import {
  getPlatformSettings,
  updatePlatformSettings,
  type PlatformSettingsData,
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
      surgePricingMultiplier?: number
      platformServiceFee?: number
      featureFlags?: Partial<PlatformSettingsData['featureFlags']>
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
      ...(body.surgePricingMultiplier != null && {
        surgePricingMultiplier: Math.max(1, Math.min(3, body.surgePricingMultiplier)),
      }),
      ...(body.platformServiceFee != null && {
        platformServiceFee: Math.max(0, body.platformServiceFee),
      }),
      ...(body.featureFlags ? { featureFlags: body.featureFlags } : {}),
    })

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update settings'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
