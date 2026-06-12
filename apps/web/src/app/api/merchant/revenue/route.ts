import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { orderGrandTotal } from '@/lib/order-totals'

// MERCHANT SIDEBAR & CATALOG REFACTOR — revenue & payout summary
export async function GET() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])

    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: {
        id: true,
        vendor: {
          select: { bankAccountRef: true, ifscCode: true },
        },
      },
    })
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })
    }

    const delivered = await prisma.order.findMany({
      where: { shopId: shop.id, status: 'DELIVERED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        totalPrice: true,
        deliveryFee: true,
        riderTip: true,
        createdAt: true,
      },
    })

    const pending = await prisma.order.findMany({
      where: {
        shopId: shop.id,
        status: { in: ['OUT_FOR_DELIVERY', 'PREPARING', 'ACCEPTED_BY_SHOP'] },
      },
      select: { totalPrice: true, deliveryFee: true, riderTip: true },
    })

    const totalRevenue = delivered.reduce((sum, o) => sum + orderGrandTotal(o), 0)
    const pendingPayout = pending.reduce((sum, o) => sum + orderGrandTotal(o), 0)

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: Math.round(totalRevenue),
        deliveredOrders: delivered.length,
        pendingPayout: Math.round(pendingPayout),
        bankAccountRef: shop.vendor?.bankAccountRef ?? null,
        ifscCode: shop.vendor?.ifscCode ?? null,
        transactions: delivered.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          amount: Math.round(orderGrandTotal(o)),
          date: o.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Revenue failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
