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

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const weekAgo = new Date(Date.now() - 7 * 86400000)

    const [
      deliveredOrders,
      activeOrdersCount,
      totalShops,
      activeShops,
      totalProducts,
      totalCustomers,
      ordersToday,
      revenueTodayOrders,
      recentOrders,
      weekOrders,
      shopsByType,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'DELIVERED' },
        select: { totalPrice: true, deliveryFee: true, riderTip: true, discountAmount: true },
      }),
      prisma.order.count({
        where: { status: { in: ACTIVE_STATUSES } },
      }),
      prisma.shop.count(),
      prisma.shop.count({ where: { isActive: true } }),
      prisma.product.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.findMany({
        where: { status: 'DELIVERED', deliveredAt: { gte: todayStart } },
        select: { totalPrice: true, deliveryFee: true, riderTip: true, discountAmount: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          shop: { select: { name: true, slug: true } },
          customer: { select: { name: true } },
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { createdAt: true },
      }),
      prisma.shop.groupBy({
        by: ['storeType'],
        _count: { id: true },
      }),
    ])

    const totalGTV = deliveredOrders.reduce((sum, o) => sum + orderGrandTotal(o), 0)
    const revenueToday = revenueTodayOrders.reduce((sum, o) => sum + orderGrandTotal(o), 0)

    const ordersByDay: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      ordersByDay[d.toISOString().slice(0, 10)] = 0
    }
    for (const o of weekOrders) {
      const key = o.createdAt.toISOString().slice(0, 10)
      if (key in ordersByDay) ordersByDay[key]++
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalGTV: Math.round(totalGTV),
        activeOrders: activeOrdersCount,
        shopCount: totalShops,
        activeShops,
        productCount: totalProducts,
        deliveredOrders: deliveredOrders.length,
        totalCustomers,
        ordersToday,
        revenueToday: Math.round(revenueToday),
      },
      ordersLast7Days: Object.entries(ordersByDay).map(([date, count]) => ({ date, count })),
      ordersByStoreType: shopsByType.map((s) => ({
        type: s.storeType,
        count: s._count.id,
      })),
      systemHealth: {
        status: totalShops > 0 && totalProducts > 0 ? 'operational' : 'degraded',
        database: 'connected',
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        shopName: o.shop.name,
        customerName: o.customer.name,
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
