import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { orderGrandTotal } from '@/lib/order-totals'

const PLATFORM_FEE_RATE = 0.05

export async function GET(request: Request) {
  try {
    await requireSession(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') ?? 'week'
    const now = new Date()
    let start: Date

    if (range === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (range === 'custom') {
      const from = searchParams.get('from')
      start = from ? new Date(from) : new Date(now.getTime() - 7 * 86400000)
    } else {
      start = new Date(now.getTime() - 7 * 86400000)
    }

    const delivered = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: { gte: start },
      },
      include: { shop: { select: { id: true, name: true, storeType: true } } },
    })

    const gmv = delivered.reduce((s, o) => s + orderGrandTotal(o), 0)
    const deliveryFees = delivered.reduce((s, o) => s + o.deliveryFee, 0)
    const platformFees = Math.round(gmv * PLATFORM_FEE_RATE)

    const byShop = new Map<string, { name: string; revenue: number }>()
    for (const o of delivered) {
      const key = o.shop.id
      const prev = byShop.get(key) ?? { name: o.shop.name, revenue: 0 }
      prev.revenue += orderGrandTotal(o)
      byShop.set(key, prev)
    }

    const shopBreakdown = Array.from(byShop.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((s) => ({ shopName: s.name, revenue: Math.round(s.revenue) }))

    const topShops = shopBreakdown.slice(0, 10)

    return NextResponse.json({
      success: true,
      data: {
        gmv: Math.round(gmv),
        platformFees,
        deliveryFees: Math.round(deliveryFees),
        orderCount: delivered.length,
        shopBreakdown,
        topShops,
        range,
        startDate: start.toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
