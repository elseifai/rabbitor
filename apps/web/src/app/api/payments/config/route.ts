import { NextResponse } from 'next/server'
import { isRazorpayConfigured } from '@/lib/payment-intent-server'

/** GET /api/payments/config — runtime payment availability (avoids stale build-time env). */
export async function GET() {
  const key =
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ??
    process.env.RAZORPAY_KEY_ID ??
    ''

  return NextResponse.json({
    success: true,
    data: {
      enabled: isRazorpayConfigured(),
      key,
    },
  })
}
