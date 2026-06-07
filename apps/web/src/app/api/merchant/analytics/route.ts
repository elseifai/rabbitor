import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { orderGrandTotal } from '@/lib/order-totals'

export async function GET() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])

    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true, name: true },
    })

    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })
    }

    const deliveredOrders = await prisma.order.findMany({
      where: { shopId: shop.id, status: 'DELIVERED' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        totalPrice: true,
        deliveryFee: true,
        riderTip: true,
        createdAt: true,
      },
    })

    const orderCount = deliveredOrders.length
    const revenueSum = deliveredOrders.reduce((sum, o) => sum + orderGrandTotal(o), 0)
    const averageOrderValue = orderCount > 0 ? revenueSum / orderCount : 0

    const chartOrders = deliveredOrders.slice(0, 5).reverse().map((o) => ({
      grandTotal: orderGrandTotal(o),
      createdAt: o.createdAt.toISOString(),
      label: o.createdAt.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
    }))

    return NextResponse.json({
      success: true,
      shopName: shop.name,
      metrics: {
        totalRevenue: Math.round(revenueSum),
        totalOrders: orderCount,
        aov: Math.round(averageOrderValue),
      },
      chartData: chartOrders,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analytics failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
