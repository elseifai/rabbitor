import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { confirmPaymentIntent } from '@/lib/payment-intent-server'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user || session.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can confirm payments' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as {
      razorpayOrderId?: string
      razorpayPaymentId?: string
      razorpaySignature?: string
    }

    if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      return NextResponse.json({ success: false, error: 'Missing payment fields' }, { status: 400 })
    }

    const { order } = await confirmPaymentIntent({
      customerId: user.id,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment confirmation failed'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
