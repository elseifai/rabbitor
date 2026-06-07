import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCustomerOwnsOrder, createRazorpayOrder } from '@/lib/payment-server'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can pay for orders' },
        { status: 403 },
      )
    }

    const { orderId } = (await request.json()) as { orderId?: string }
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 })
    }

    const order = await assertCustomerOwnsOrder(orderId, user.id)
    const amount = order.totalPrice + order.deliveryFee + order.riderTip
    const result = await createRazorpayOrder(orderId, amount)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment setup failed'
    const status = message.includes('not configured') ? 503 : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
