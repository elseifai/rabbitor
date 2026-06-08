import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Persists a customer review and recomputes the shop's rating average. */
export async function POST(request: Request) {
  try {
    const session = await requireSession(['CUSTOMER'])
    const body = await request.json()
    const { orderId, shopRating, riderRating, comment } = body as {
      orderId?: string
      shopRating?: number
      riderRating?: number
      comment?: string
    }

    if (!orderId || !shopRating || !riderRating) {
      return NextResponse.json(
        { success: false, error: 'orderId, shopRating and riderRating required' },
        { status: 400 },
      )
    }

    // Order must exist and belong to this customer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { shopId: true, customerId: true, deliveryPartnerId: true },
    })
    if (!order || order.customerId !== session.userId) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // One review per order (idempotent)
    const review = await prisma.review.upsert({
      where: { orderId },
      create: {
        orderId,
        shopId: order.shopId,
        customerId: session.userId,
        riderId: order.deliveryPartnerId,
        shopRating: Math.max(1, Math.min(5, Math.round(shopRating))),
        riderRating: Math.max(1, Math.min(5, Math.round(riderRating))),
        comment: comment ?? null,
      },
      update: {
        shopRating: Math.max(1, Math.min(5, Math.round(shopRating))),
        riderRating: Math.max(1, Math.min(5, Math.round(riderRating))),
        comment: comment ?? null,
      },
    })

    // Recompute the shop's rating average from all its reviews
    const agg = await prisma.review.aggregate({
      where: { shopId: order.shopId },
      _avg: { shopRating: true },
      _count: { _all: true },
    })
    await prisma.shop.update({
      where: { id: order.shopId },
      data: {
        ratingAvg: agg._avg.shopRating ?? 0,
        ratingCount: agg._count._all,
      },
    })

    return NextResponse.json({ success: true, data: review })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review failed'
    const code = /log in/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
