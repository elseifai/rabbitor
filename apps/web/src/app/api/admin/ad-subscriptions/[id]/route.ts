import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { AdSettlementMethod, AdSubscriptionStatus } from '@rabbit/database'
import { settleAdSubscriptionPlan } from '@/lib/ad-subscription'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params
    const body = (await request.json()) as { status?: AdSubscriptionStatus }

    if (!body.status) {
      return NextResponse.json({ success: false, error: 'status required' }, { status: 400 })
    }

    const plan = await prisma.adSubscriptionPlan.update({
      where: { id },
      data: { status: body.status, pausedByKillSwitch: false },
    })
    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params
    const body = (await request.json()) as {
      settlementMethod?: AdSettlementMethod
      settlementRef?: string
    }

    if (!body.settlementMethod) {
      return NextResponse.json(
        { success: false, error: 'settlementMethod required (EXTERNAL_PAYMENT | PAYOUT_DEDUCTION)' },
        { status: 400 },
      )
    }

    const plan = await settleAdSubscriptionPlan(id, body.settlementMethod, body.settlementRef)
    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied|Insufficient|already settled/i.test(message) ? 400 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
