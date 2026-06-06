import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canTransition, ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import { broadcastOrderEvent } from '@/lib/order-events'
import type { OrderStatus } from '@rabbit/database'

const ORDER_INCLUDE = {
  shop: { select: { name: true, address: true, category: true } },
  deliveryPartner: { select: { id: true, name: true, phone: true } },
  items: {
    include: { product: { select: { name: true, unit: true } } },
  },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order context matrix not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch order'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await requireSession(['MERCHANT', 'ADMIN', 'DELIVERY_PARTNER'])
    const body = await request.json()
    const { status } = body as { status?: OrderStatus }

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Invalid state transition payload assignment' },
        { status: 400 },
      )
    }

    const preflight = await prisma.order.findUnique({
      where: { id },
      include: { shop: { select: { ownerId: true } } },
    })
    if (!preflight) {
      return NextResponse.json({ success: false, error: 'Order target destroyed or missing' }, { status: 404 })
    }

    if (session.role === 'MERCHANT' && preflight.shop.ownerId !== session.userId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    if (!canTransition(preflight.status, status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot move from ${preflight.status} to ${status}`,
        },
        { status: 400 },
      )
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const targetOrder = await tx.order.findUnique({
        where: { id },
        include: { shop: true },
      })
      if (!targetOrder) throw new Error('Order target destroyed or missing')

      if (!canTransition(targetOrder.status, status)) {
        throw new Error(`Cannot move from ${targetOrder.status} to ${status}`)
      }

      let deliveryPartnerId = targetOrder.deliveryPartnerId
      if (status === 'OUT_FOR_DELIVERY' && !deliveryPartnerId) {
        const rider = await tx.user.findFirst({
          where: { role: 'DELIVERY_PARTNER' },
          orderBy: { createdAt: 'asc' },
        })
        if (rider) deliveryPartnerId = rider.id
      }

      return tx.order.update({
        where: { id },
        data: {
          status,
          ...(deliveryPartnerId && !targetOrder.deliveryPartnerId
            ? { deliveryPartnerId }
            : {}),
          statusHistory: {
            create: { status, note: `Updated via API by ${session.role}` },
          },
        },
        include: ORDER_INCLUDE,
      })
    })

    await broadcastOrderEvent(id, { type: 'status', status: ORDER_STATUS_LABELS[status] })

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      status: ORDER_STATUS_LABELS[status],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Status update failed'
    if (/log in|access denied/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 401 })
    }
    if (/cannot move|destroyed or missing/i.test(message)) {
      const status = /destroyed or missing/i.test(message) ? 404 : 400
      return NextResponse.json({ success: false, error: message }, { status })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
