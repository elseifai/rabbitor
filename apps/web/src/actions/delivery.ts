'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import type { OrderStatus } from '@rabbit/database'

export async function getAvailableDeliveryOrdersAction() {
  const session = await requireSession(['DELIVERY_PARTNER', 'ADMIN'])

  const orders = await db.order.findMany({
    where: {
      status: { in: ['PREPARING', 'OUT_FOR_DELIVERY'] },
      OR: [{ deliveryPartnerId: null }, { deliveryPartnerId: session.userId }],
    },
    include: {
      shop: { select: { name: true, latitude: true, longitude: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    shopName: o.shop.name,
    deliveryFee: o.deliveryFee,
    itemCount: o._count.items,
    isAssigned: o.deliveryPartnerId === session.userId,
    destLat: o.destLatitude,
    destLng: o.destLongitude,
  }))
}

export async function acceptDeliveryOrderAction(orderId: string) {
  const session = await requireSession(['DELIVERY_PARTNER', 'ADMIN'])

  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) return { ok: false as const, error: 'Order not found' }

  if (order.deliveryPartnerId && order.deliveryPartnerId !== session.userId) {
    return { ok: false as const, error: 'Already assigned to another partner' }
  }

  if (!['PREPARING', 'OUT_FOR_DELIVERY'].includes(order.status)) {
    return { ok: false as const, error: 'Order is not available for delivery' }
  }

  await db.order.update({
    where: { id: orderId },
    data: { deliveryPartnerId: session.userId },
  })

  revalidatePath('/delivery')
  revalidatePath('/delivery/navigate')
  return { ok: true as const }
}

export async function getActiveDeliveryAction() {
  const session = await requireSession(['DELIVERY_PARTNER', 'ADMIN'])

  const order = await db.order.findFirst({
    where: {
      deliveryPartnerId: session.userId,
      status: { in: ['PREPARING', 'OUT_FOR_DELIVERY'] as OrderStatus[] },
    },
    include: {
      shop: { select: { name: true, latitude: true, longitude: true, address: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!order) return null

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    shopName: order.shop.name,
    shopAddress: order.shop.address,
    shopLat: order.shop.latitude,
    shopLng: order.shop.longitude,
    destLat: order.destLatitude,
    destLng: order.destLongitude,
    deliveryAddress: order.deliveryAddress,
  }
}
