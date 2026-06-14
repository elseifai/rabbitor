import { NextResponse } from 'next/server'

/** Order-first payments are disabled — use /api/payments/intent instead. */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Direct order payments are disabled. Complete checkout via the payment intent flow.',
    },
    { status: 410 },
  )
}
