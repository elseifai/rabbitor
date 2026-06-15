import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession(['ADMIN'])
    const { id: riderId } = await params
    const body = (await request.json()) as {
      action?: 'forceAssign' | 'resetJobCache' | 'manualPayout'
      orderId?: string
      amount?: number
    }

    const rider = await prisma.user.findFirst({
      where: { id: riderId, role: 'RABBITOR' },
      include: { rabbitorProfile: true },
    })
    if (!rider) {
      return NextResponse.json({ success: false, error: 'Rider not found' }, { status: 404 })
    }

    if (body.action === 'forceAssign') {
      if (!body.orderId) {
        return NextResponse.json({ success: false, error: 'orderId required' }, { status: 400 })
      }
      const order = await prisma.order.update({
        where: { id: body.orderId },
        data: { deliveryPartnerId: riderId, status: 'OUT_FOR_DELIVERY' },
        select: { id: true, orderNumber: true },
      })
      return NextResponse.json({ success: true, data: order, message: 'Order assigned to rider' })
    }

    if (body.action === 'resetJobCache') {
      await prisma.rabbitorProfile.update({
        where: { userId: riderId },
        data: { isAvailable: true },
      })
      await prisma.order.updateMany({
        where: {
          deliveryPartnerId: riderId,
          status: { in: ['PREPARING', 'OUT_FOR_DELIVERY', 'ACCEPTED_BY_SHOP'] },
        },
        data: { deliveryPartnerId: null },
      })
      return NextResponse.json({ success: true, message: 'Rider job cache cleared' })
    }

    if (body.action === 'manualPayout') {
      const profile = rider.rabbitorProfile
      if (!profile?.bankAccountNumber || !profile.ifscCode) {
        return NextResponse.json(
          { success: false, error: 'Rider banking details not on file' },
          { status: 400 },
        )
      }
      return NextResponse.json({
        success: true,
        message: `Manual payout queued to ${profile.bankName ?? 'bank'} · ****${profile.bankAccountNumber.slice(-4)}`,
        amount: body.amount ?? null,
      })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
