import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { orderGrandTotal } from '@/lib/order-totals'

// MERCHANT SIDEBAR & CATALOG REFACTOR — all shop orders for pipeline views
export async function GET() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true },
    })
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })
    }

    const orders = await prisma.order.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalPrice: true,
        deliveryFee: true,
        riderTip: true,
        createdAt: true,
        items: { select: { quantity: true } },
      },
    })

    return NextResponse.json({
      success: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalPrice: orderGrandTotal(o),
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        createdAt: o.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load orders'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
