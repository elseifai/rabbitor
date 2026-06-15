import { NextResponse } from 'next/server'
import { isRazorpayConfigured } from '@/lib/payment-intent-server'
import { getPlatformSettings } from '@/lib/platform-settings'

/** GET /api/payments/config — runtime payment + platform checkout thresholds. */
export async function GET() {
  const key =
    process.env.RAZORPAY_KEY_ID ??
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ??
    ''

  const platform = await getPlatformSettings()

  return NextResponse.json({
    success: true,
    data: {
      enabled: isRazorpayConfigured() && platform.featureFlags.customer.razorpayEnabled,
      key: platform.featureFlags.customer.razorpayEnabled ? key : '',
      globalMinCartValue: platform.globalMinCartValue,
      multiShopRoutingFeePerLeg: platform.multiShopRoutingFeePerLeg,
      freeDeliveryThreshold: platform.freeDeliveryThreshold,
      featureFlags: platform.featureFlags,
    },
  })
}
