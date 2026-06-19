import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { markPaymentIntentFailed } from '@/lib/payment-intent-server'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user || session.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can update payment status' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as {
      intentId?: string
      reason?: string
    }

    if (!body.intentId) {
      return NextResponse.json({ success: false, error: 'intentId is required' }, { status: 400 })
    }

    const intent = await markPaymentIntentFailed(
      body.intentId,
      user.id,
      body.reason?.trim() || 'Payment cancelled',
    )

    return NextResponse.json({
      success: true,
      data: {
        intentId: intent.id,
        status: intent.status,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update payment status'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
