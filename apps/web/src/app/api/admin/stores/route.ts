import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import {
  computeFulfillmentRate,
  computeHandoverMinutes,
  computeStoreTier,
} from '@/lib/store-performance'
import { computePositiveFeedbackPercent } from '@/lib/catalog-performance'
import { aggregateStoreFeedback } from '@/lib/master-catalog-metrics'

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function thirtyDaysAgo() {
  return new Date(Date.now() - 30 * 86400000)
}

export async function GET() {
  try {
    await requireSession(['ADMIN'])
    const dayStart = startOfDay()
    const periodStart = thirtyDaysAgo()
    const now = new Date()

    const [shops, storeFeedbackMap] = await Promise.all([
      prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { phone: true, name: true } },
        _count: { select: { orders: true, products: true } },
        orders: {
          where: { createdAt: { gte: dayStart }, paymentStatus: 'PAID' },
          select: { totalPrice: true, status: true, createdAt: true },
        },
        coupons: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    }),
      aggregateStoreFeedback(),
    ])

    const performanceRows = await Promise.all(
      shops.map(async (s) => {
        const recentOrders = await prisma.order.findMany({
          where: {
            shopId: s.id,
            createdAt: { gte: periodStart },
            status: { in: ['DELIVERED', 'OUT_FOR_DELIVERY', 'CANCELLED'] },
          },
          select: {
            status: true,
            statusHistory: { orderBy: { createdAt: 'asc' }, select: { status: true, createdAt: true } },
          },
        })

        const delivered = recentOrders.filter((o) => o.status === 'DELIVERED').length
        const cancelled = recentOrders.filter((o) => o.status === 'CANCELLED').length
        const handoverMin = computeHandoverMinutes(recentOrders, s.avgPrepMinutes)
        const fulfillmentRate = computeFulfillmentRate(delivered, cancelled)
        const tier = computeStoreTier(handoverMin, fulfillmentRate)
        const shopRatings = storeFeedbackMap.get(s.id) ?? []
        const customerFeedbackPositivePercent = computePositiveFeedbackPercent(shopRatings)

        const liveOrders = s.orders.filter((o) =>
          ['PENDING', 'ACCEPTED_BY_SHOP', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.status),
        ).length
        const dailyRevenue = s.orders.reduce((sum, o) => sum + o.totalPrice, 0)
        const oldestActive = s.orders
          .filter((o) => ['PREPARING', 'ACCEPTED_BY_SHOP'].includes(o.status))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]
        const packingDelayMin = oldestActive
          ? Math.max(0, Math.round((Date.now() - oldestActive.createdAt.getTime()) / 60000) - s.avgPrepMinutes)
          : 0

        let isActive = s.isActive
        if (s.pausedUntil && s.pausedUntil <= now && !s.isActive) {
          await prisma.shop.update({
            where: { id: s.id },
            data: { isActive: true, pausedUntil: null },
          })
          isActive = true
        }

        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          storeType: s.storeType,
          category: s.category,
          address: s.address,
          isActive,
          pausedUntil: s.pausedUntil?.toISOString() ?? null,
          ownerPhone: s.owner.phone,
          ownerName: s.owner.name,
          orderCount: s._count.orders,
          productCount: s._count.products,
          liveOrders,
          dailyRevenue,
          packingDelayMin,
          handoverMin: Math.round(handoverMin * 10) / 10,
          fulfillmentRate,
          customerFeedbackPositivePercent,
          activePromotions: s.coupons.length,
          performanceTier: tier,
          minOrderValue: s.minOrderValue,
          packingCharge: s.packingCharge,
          deliveryRadiusKm: s.deliveryRadiusKm,
          avgPrepMinutes: s.avgPrepMinutes,
          openingHours: s.openingHours,
          ratingAvg: s.ratingAvg,
          ratingCount: s.ratingCount,
          createdAt: s.createdAt.toISOString(),
        }
      }),
    )

    return NextResponse.json({ success: true, data: performanceRows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
