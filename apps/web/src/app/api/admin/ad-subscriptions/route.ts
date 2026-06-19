import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { AdSubscriptionPlanType, AdSettlementMethod } from '@rabbit/database'
import { planEndDate, settleAdSubscriptionPlan } from '@/lib/ad-subscription'

export async function GET() {
  try {
    await requireSession(['ADMIN'])
    const plans = await prisma.adSubscriptionPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: { select: { id: true, businessName: true } },
        shop: { select: { id: true, name: true, isActive: true } },
      },
    })
    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const body = (await request.json()) as {
      merchantId?: string
      shopId?: string
      planType?: AdSubscriptionPlanType
      tierLevel?: number
      pricePaid?: number
      startDate?: string
    }

    if (!body.merchantId || !body.planType || body.pricePaid == null) {
      return NextResponse.json(
        { success: false, error: 'merchantId, planType, and pricePaid are required' },
        { status: 400 },
      )
    }

    const start = body.startDate ? new Date(body.startDate) : new Date()
    const plan = await prisma.adSubscriptionPlan.create({
      data: {
        merchantId: body.merchantId,
        shopId: body.shopId ?? null,
        planType: body.planType,
        startDate: start,
        endDate: planEndDate(start, body.planType),
        tierLevel: Math.max(1, body.tierLevel ?? 1),
        pricePaid: Math.max(0, body.pricePaid),
        status: 'ACTIVE',
      },
      include: {
        merchant: { select: { businessName: true } },
        shop: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
