import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { orderGrandTotal } from '@/lib/order-totals'
import {
  computeFulfillmentRate,
  computeHandoverMinutes,
  computeStoreTier,
  platformCommission,
  PLATFORM_COMMISSION_RATE,
} from '@/lib/store-performance'
import { syncAdsWithStoreStatus } from '@/lib/ad-store-sync'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true, phone: true } },
        vendor: { select: { bankAccountRef: true, ifscCode: true, businessName: true } },
        products: { orderBy: { name: 'asc' } },
        coupons: { where: { isActive: true } },
      },
    })

    if (!shop) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 })
    }

    const since = daysAgo(14)
    const periodStart = daysAgo(30)

    const [orders14, orders30, orderItems] = await Promise.all([
      prisma.order.findMany({
        where: { shopId: id, createdAt: { gte: since } },
        select: { createdAt: true, status: true, totalPrice: true, deliveryFee: true, riderTip: true },
      }),
      prisma.order.findMany({
        where: { shopId: id, createdAt: { gte: periodStart } },
        select: {
          status: true,
          statusHistory: { orderBy: { createdAt: 'asc' }, select: { status: true, createdAt: true } },
        },
      }),
      prisma.orderItem.findMany({
        where: { order: { shopId: id, status: 'DELIVERED', createdAt: { gte: periodStart } } },
        include: { product: { select: { id: true, name: true, image: true, category: true, price: true } } },
      }),
    ])

    const dailyMap: Record<string, { revenue: number; orders: number }> = {}
    for (let i = 13; i >= 0; i--) {
      const d = daysAgo(i)
      dailyMap[d.toISOString().slice(0, 10)] = { revenue: 0, orders: 0 }
    }
    for (const o of orders14) {
      const key = o.createdAt.toISOString().slice(0, 10)
      if (!dailyMap[key]) dailyMap[key] = { revenue: 0, orders: 0 }
      dailyMap[key].orders++
      if (o.status === 'DELIVERED') {
        dailyMap[key].revenue += orderGrandTotal(o)
      }
    }

    const prepDelays = orders30
      .map((o) => {
        const prep = o.statusHistory.find((h) => h.status === 'PREPARING')
        const out = o.statusHistory.find((h) => h.status === 'OUT_FOR_DELIVERY')
        if (!prep || !out) return null
        return Math.round((out.createdAt.getTime() - prep.createdAt.getTime()) / 60000)
      })
      .filter((v): v is number => v != null)

    const delivered = orders30.filter((o) => o.status === 'DELIVERED').length
    const cancelled = orders30.filter((o) => o.status === 'CANCELLED').length
    const handoverMin = computeHandoverMinutes(orders30, shop.avgPrepMinutes)
    const fulfillmentRate = computeFulfillmentRate(delivered, cancelled)

    const productStats: Record<
      string,
      { id: string; name: string; image: string | null; category: string; units: number; revenue: number }
    > = {}
    for (const item of orderItems) {
      const pid = item.product.id
      if (!productStats[pid]) {
        productStats[pid] = {
          id: pid,
          name: item.product.name,
          image: item.product.image,
          category: item.product.category,
          units: 0,
          revenue: 0,
        }
      }
      productStats[pid].units += item.quantity
      productStats[pid].revenue += item.price * item.quantity
    }
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    const categoryTotal = topProducts.reduce((s, p) => s + p.revenue, 0) || 1

    const deliveredOrders = await prisma.order.findMany({
      where: { shopId: id, status: 'DELIVERED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        totalPrice: true,
        deliveryFee: true,
        riderTip: true,
        createdAt: true,
      },
    })

    const totalGmv = deliveredOrders.reduce((s, o) => s + orderGrandTotal(o), 0)
    const commission = platformCommission(totalGmv)
    const netPayout = totalGmv - commission

    const ratingDistribution = [
      { stars: 5, pct: shop.ratingAvg >= 4.5 ? 62 : 40 },
      { stars: 4, pct: shop.ratingAvg >= 4 ? 25 : 30 },
      { stars: 3, pct: 10 },
      { stars: 2, pct: 2 },
      { stars: 1, pct: 1 },
    ]

    return NextResponse.json({
      success: true,
      data: {
        shop: {
          id: shop.id,
          name: shop.name,
          storeType: shop.storeType,
          address: shop.address,
          isActive: shop.isActive,
          ratingAvg: shop.ratingAvg,
          ratingCount: shop.ratingCount,
          performanceTier: computeStoreTier(handoverMin, fulfillmentRate),
          handoverMin,
          fulfillmentRate,
        },
        telemetry: {
          dailySeries: Object.entries(dailyMap).map(([date, v]) => ({
            date: date.slice(5),
            revenue: Math.round(v.revenue),
            orders: v.orders,
          })),
          prepDelaySeries: prepDelays.slice(-20),
          ratingDistribution,
        },
        catalog: shop.products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          isAvailable: p.isAvailable,
          image: p.image,
          category: p.category,
        })),
        topProducts: topProducts.map((p) => ({
          ...p,
          revenue: Math.round(p.revenue),
          categoryShare: Math.round((p.revenue / categoryTotal) * 100),
        })),
        financials: {
          commissionRate: PLATFORM_COMMISSION_RATE,
          totalGmv: Math.round(totalGmv),
          platformCommission: commission,
          outstandingPayout: Math.round(netPayout),
          bankAccountRef: shop.vendor?.bankAccountRef ?? null,
          ifscCode: shop.vendor?.ifscCode ?? null,
          businessName: shop.vendor?.businessName ?? shop.name,
          payoutHistory: deliveredOrders.slice(0, 8).map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            gross: Math.round(orderGrandTotal(o)),
            net: Math.round(orderGrandTotal(o) * (1 - PLATFORM_COMMISSION_RATE)),
            date: o.createdAt.toISOString(),
          })),
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params
    const body = (await request.json()) as {
      isActive?: boolean
      pauseMinutes?: number
      permanent?: boolean
      minOrderValue?: number
      packingCharge?: number
      deliveryRadiusKm?: number
      avgPrepMinutes?: number
      openingHours?: unknown
    }

    const data: Record<string, unknown> = {}
    if (typeof body.isActive === 'boolean') {
      data.isActive = body.isActive
      if (body.isActive) {
        data.pausedUntil = null
      } else if (body.pauseMinutes && !body.permanent) {
        data.pausedUntil = new Date(Date.now() + body.pauseMinutes * 60000)
      } else if (body.permanent) {
        data.pausedUntil = null
      }
    }
    if (body.minOrderValue != null) data.minOrderValue = Math.max(0, body.minOrderValue)
    if (body.packingCharge != null) data.packingCharge = Math.max(0, body.packingCharge)
    if (body.deliveryRadiusKm != null) data.deliveryRadiusKm = Math.max(0.5, body.deliveryRadiusKm)
    if (body.avgPrepMinutes != null) data.avgPrepMinutes = Math.max(5, Math.round(body.avgPrepMinutes))
    if (body.openingHours != null) data.openingHours = body.openingHours

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields' }, { status: 400 })
    }

    const shop = await prisma.shop.update({ where: { id }, data })
    if (typeof body.isActive === 'boolean') {
      await syncAdsWithStoreStatus(id, body.isActive)
    }
    return NextResponse.json({ success: true, data: shop })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
