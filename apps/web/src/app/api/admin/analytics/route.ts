import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { orderGrandTotal } from '@/lib/order-totals'
import { ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import {
  resolveDateRange,
  previousPeriod,
  pctChange,
  bucketKeys,
  bucketLabel,
  orderBucketKey,
  type AnalyticsInterval,
} from '@/lib/admin-analytics'
import type { OrderStatus } from '@rabbit/database'

const PROGRESS_STEPS: OrderStatus[] = [
  'PENDING',
  'ACCEPTED_BY_SHOP',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

function progressPercent(status: OrderStatus): number {
  if (status === 'CANCELLED') return 0
  const idx = PROGRESS_STEPS.indexOf(status)
  if (idx < 0) return 0
  return Math.round(((idx + 1) / PROGRESS_STEPS.length) * 100)
}

export async function GET(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const { searchParams } = new URL(request.url)
    const range = resolveDateRange({
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      interval: searchParams.get('interval'),
    })
    const prev = previousPeriod(range.from, range.to)
    const interval = range.interval

    const orderSelect = {
      id: true,
      orderNumber: true,
      status: true,
      totalPrice: true,
      deliveryFee: true,
      riderTip: true,
      discountAmount: true,
      createdAt: true,
      paymentStatus: true,
      shop: { select: { name: true, storeType: true, slug: true } },
      customer: { select: { name: true, phone: true, displayName: true } },
      deliveryPartner: { select: { id: true, name: true, displayName: true, phone: true } },
      childOrders: {
        select: {
          id: true,
          shop: { select: { name: true, storeType: true } },
          status: true,
        },
      },
      parentOrderId: true,
    } as const

    const [
      periodOrders,
      deliveredPeriod,
      deliveredPrev,
      cancelledPeriod,
      cancelledPrev,
      activeShops,
      inactiveShops,
      onlineRiders,
      activeRoutes,
      recentOrders,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: range.from, lte: range.to } },
        select: {
          createdAt: true,
          status: true,
          totalPrice: true,
          deliveryFee: true,
          riderTip: true,
          shop: { select: { storeType: true } },
        },
      }),
      prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          deliveredAt: { gte: range.from, lte: range.to },
        },
        select: { totalPrice: true, deliveryFee: true, riderTip: true, shop: { select: { storeType: true } } },
      }),
      prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          deliveredAt: { gte: prev.from, lte: prev.to },
        },
        select: { totalPrice: true, deliveryFee: true, riderTip: true },
      }),
      prisma.order.count({
        where: { status: 'CANCELLED', createdAt: { gte: range.from, lte: range.to } },
      }),
      prisma.order.count({
        where: { status: 'CANCELLED', createdAt: { gte: prev.from, lte: prev.to } },
      }),
      prisma.shop.count({ where: { isActive: true } }),
      prisma.shop.count({ where: { isActive: false } }),
      prisma.rabbitorProfile.count({ where: { isAvailable: true } }),
      prisma.order.count({
        where: { status: 'OUT_FOR_DELIVERY', deliveryPartnerId: { not: null } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: range.from, lte: range.to }, parentOrderId: null },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: orderSelect,
      }),
    ])

    const gmv = deliveredPeriod.reduce((s, o) => s + orderGrandTotal(o), 0)
    const prevGmv = deliveredPrev.reduce((s, o) => s + orderGrandTotal(o), 0)
    const completedCount = deliveredPeriod.length
    const prevCompleted = deliveredPrev.length

    const keys = bucketKeys(range.from, range.to, interval)
    const revenueSeries: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]))
    const orderSeries: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]))

    for (const o of periodOrders) {
      const key = orderBucketKey(o.createdAt, interval)
      if (key in orderSeries) orderSeries[key]++
      if (o.status === 'DELIVERED') {
        if (key in revenueSeries) revenueSeries[key] += orderGrandTotal(o)
      }
    }

    const revenueVsOrders = keys.map((k) => ({
      label: bucketLabel(k, interval),
      revenue: Math.round(revenueSeries[k] ?? 0),
      orders: orderSeries[k] ?? 0,
    }))

    const categoryMap: Record<string, number> = {}
    for (const o of deliveredPeriod) {
      const t = o.shop.storeType
      categoryMap[t] = (categoryMap[t] ?? 0) + orderGrandTotal(o)
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, revenue]) => ({ category, revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue)

    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    for (const o of periodOrders) {
      const d = o.createdAt
      const day = (d.getDay() + 6) % 7
      heatmap[day][d.getHours()]++
    }

    const sparklineGmv = keys.map((k) => Math.round(revenueSeries[k] ?? 0))
    const sparklineOrders = keys.map((k) => orderSeries[k] ?? 0)

    const totalRiders = await prisma.rabbitorProfile.count()

    return NextResponse.json({
      success: true,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        preset: range.preset,
        interval,
      },
      kpis: {
        gmv: {
          value: Math.round(gmv),
          changePct: pctChange(gmv, prevGmv),
          sparkline: sparklineGmv,
        },
        orders: {
          completed: completedCount,
          cancelled: cancelledPeriod,
          changePct: pctChange(completedCount, prevCompleted),
          sparkline: sparklineOrders,
        },
        merchants: {
          online: activeShops,
          offline: inactiveShops,
          changePct: 0,
          sparkline: keys.map(() => activeShops),
        },
        riders: {
          online: onlineRiders,
          onRoute: activeRoutes,
          total: totalRiders,
          changePct: pctChange(onlineRiders, Math.max(0, onlineRiders - 1)),
          sparkline: keys.map(() => onlineRiders),
        },
      },
      charts: {
        revenueVsOrders,
        categoryBreakdown,
        heatmap,
        heatmapLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      recentOrders: recentOrders.map((o) => {
        const shops =
          o.childOrders.length > 0
            ? o.childOrders.map((c) => ({ name: c.shop.name, type: c.shop.storeType }))
            : [{ name: o.shop.name, type: o.shop.storeType }]
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customer.displayName ?? o.customer.name,
          customerPhone: o.customer.phone,
          shops,
          riderStatus: o.deliveryPartner
            ? {
                name: o.deliveryPartner.displayName ?? o.deliveryPartner.name,
                phone: o.deliveryPartner.phone,
                assigned: true,
              }
            : { assigned: false },
          status: o.status,
          statusLabel: ORDER_STATUS_LABELS[o.status],
          progress: progressPercent(o.status),
          progressSteps: PROGRESS_STEPS.map((s) => ({
            key: s,
            label: ORDER_STATUS_LABELS[s],
            done:
              o.status === 'CANCELLED'
                ? false
                : PROGRESS_STEPS.indexOf(s) <= PROGRESS_STEPS.indexOf(o.status),
          })),
          netPayout: Math.round(orderGrandTotal(o)),
          createdAt: o.createdAt.toISOString(),
        }
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analytics failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
