import { NextResponse } from 'next/server'
import { requireCustomerCheckoutSession } from '@/lib/auth'
import { getPlatformSettings } from '@/lib/platform-settings'
import {
  createCodOrderFromCheckout,
  validateCheckoutInput,
  type CheckoutInput,
} from '@/lib/checkout-order'

export async function POST(request: Request) {
  try {
    const platform = await getPlatformSettings()
    if (platform.featureFlags.customer.codEnabled === false) {
      return NextResponse.json(
        { success: false, error: 'Cash on delivery is not available right now.' },
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
    const checkout = await validateCheckoutInput(body)
    const order = await createCodOrderFromCheckout({ customerId: user.id, checkout })

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not place order'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
