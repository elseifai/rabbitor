import { NextResponse } from 'next/server'
import { requireCustomerCheckoutSession } from '@/lib/auth'
import { createPaymentIntent, formatPaymentError, isRazorpayConfigured } from '@/lib/payment-intent-server'
import type { CheckoutInput } from '@/lib/checkout-order'

export async function POST(request: Request) {
  try {
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Online payment is not available. Please try again later.' },
        { status: 503 },
      )
    }

    let user: Awaited<ReturnType<typeof requireCustomerCheckoutSession>>['user']
    try {
      ;({ user } = await requireCustomerCheckoutSession())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please log in to continue'
      const status = /log in|expired/i.test(message) ? 401 : 403
      return NextResponse.json({ success: false, error: message }, { status })
    }

    const body = (await request.json()) as CheckoutInput
    const result = await createPaymentIntent(user.id, body)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = formatPaymentError(error)
    const status = message.includes('not configured') ? 503 : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
