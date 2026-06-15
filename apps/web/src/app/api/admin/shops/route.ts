import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  try {
    await requireSession(['ADMIN'])
    const dayStart = startOfDay()

    const shops = await prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { phone: true, name: true } },
        _count: { select: { orders: true, products: true } },
        orders: {
          where: { createdAt: { gte: dayStart }, paymentStatus: 'PAID' },
          select: { totalPrice: true, status: true, createdAt: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: shops.map((s) => {
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

        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          storeType: s.storeType,
          category: s.category,
          address: s.address,
          isActive: s.isActive,
          ownerPhone: s.owner.phone,
          ownerName: s.owner.name,
          orderCount: s._count.orders,
          productCount: s._count.products,
          liveOrders,
          dailyRevenue,
          packingDelayMin,
          minOrderValue: s.minOrderValue,
          packingCharge: s.packingCharge,
          deliveryRadiusKm: s.deliveryRadiusKm,
          avgPrepMinutes: s.avgPrepMinutes,
          openingHours: s.openingHours,
          createdAt: s.createdAt.toISOString(),
        }
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
