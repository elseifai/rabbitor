import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user || session.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can checkout' },
        { status: 403 },
      )
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
