import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can checkout' },
        { status: 403 },
      )
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
