import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import { orderGrandTotal } from '@/lib/order-totals'
import type { OrderStatus } from '@rabbit/database'

const ACTIVE_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED_BY_SHOP',
  'PREPARING',
  'OUT_FOR_DELIVERY',
]

export async function GET() {
  try {
    await requireSession(['ADMIN'])

    const [deliveredOrders, activeOrdersCount, totalShops, activeShops, totalProducts, recentOrders] =
      await Promise.all([
        prisma.order.findMany({
          where: { status: 'DELIVERED' },
          select: { totalPrice: true, deliveryFee: true, riderTip: true },
        }),
        prisma.order.count({
          where: { status: { in: ACTIVE_STATUSES } },
        }),
        prisma.shop.count(),
        prisma.shop.count({ where: { isActive: true } }),
        prisma.product.count(),
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            shop: { select: { name: true, slug: true } },
          },
        }),
      ])

    const totalGTV = deliveredOrders.reduce((sum, o) => sum + orderGrandTotal(o), 0)

    return NextResponse.json({
      success: true,
      metrics: {
        totalGTV: Math.round(totalGTV),
        activeOrders: activeOrdersCount,
        shopCount: totalShops,
        activeShops,
        productCount: totalProducts,
        deliveredOrders: deliveredOrders.length,
      },
      systemHealth: {
        status: totalShops > 0 && totalProducts > 0 ? 'operational' : 'degraded',
        database: 'connected',
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        shopName: o.shop.name,
        shopSlug: o.shop.slug,
        status: o.status,
        statusLabel: ORDER_STATUS_LABELS[o.status],
        grandTotal: Math.round(orderGrandTotal(o)),
        createdAt: o.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin metrics failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
