import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canTransition, ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import { broadcastOrderEvent } from '@/lib/order-events'
import { orderGrandTotal } from '@/lib/order-totals'
import type { OrderStatus } from '@rabbit/database'

const PLATFORM_FEE = 5

const ORDER_INCLUDE = {
  shop: {
    select: {
      name: true,
      address: true,
      category: true,
      latitude: true,
      longitude: true,
      slug: true,
    },
  },
  deliveryPartner: { select: { id: true, name: true, phone: true } },
  items: {
    include: {
      product: { select: { name: true, unit: true, image: true } },
    },
  },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
} as const

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type OrderWithDetails = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.order.findUnique<{ where: { id: string }; include: typeof ORDER_INCLUDE }>
    >
  >
>

function formatOrderResponse(order: OrderWithDetails) {
  const shopLat = order.shop.latitude
  const shopLng = order.shop.longitude
  const destLat = order.destLatitude ?? shopLat
  const destLng = order.destLongitude ?? shopLng
  const distanceKm = haversineKm(shopLat, shopLng, destLat, destLng)

  return {
    ...order,
    shopLat,
    shopLng,
    rabbitorName: order.deliveryPartner?.name ?? null,
    rabbitorPhone: order.deliveryPartner?.phone ?? null,
    distanceKm: Math.round(distanceKm * 10) / 10,
    platformFee: PLATFORM_FEE,
    grandTotal: orderGrandTotal(order) + PLATFORM_FEE,
    subtotal: order.totalPrice,
    items: order.items.map((item) => ({
      ...item,
      product: {
        name: item.product.name,
        unit: item.product.unit,
        image: item.product.image,
      },
    })),
  }
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

    return NextResponse.json({ success: true, data: formatOrderResponse(order) })
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
    const session = await requireSession(['VENDOR', 'ADMIN', 'RABBITOR'])
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

    if (session.role === 'VENDOR' && preflight.shop.ownerId !== session.userId) {
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
          where: { role: 'RABBITOR' },
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
      data: formatOrderResponse(updatedOrder),
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
