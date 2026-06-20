import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])

    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true, vendorId: true },
    })
    if (!shop?.vendorId) {
      return NextResponse.json({ success: true, data: [] })
    }

    const now = new Date()
    const plans = await prisma.adSubscriptionPlan.findMany({
      where: { merchantId: shop.vendorId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        planType: true,
        status: true,
        startDate: true,
        endDate: true,
        pricePaid: true,
        tierLevel: true,
        settlementMethod: true,
        settledAt: true,
        createdAt: true,
      },
    })

    const enriched = plans.map((p) => ({
      ...p,
      isLive:
        p.status === 'ACTIVE' && p.startDate <= now && p.endDate >= now,
      daysRemaining:
        p.status === 'ACTIVE' && p.endDate >= now
          ? Math.ceil((p.endDate.getTime() - now.getTime()) / 86_400_000)
          : 0,
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscriptions'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
