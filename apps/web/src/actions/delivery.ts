'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { getApiBaseUrl, mintApiAccessToken } from '@/lib/api-jwt'
import type { OrderStatus } from '@rabbit/database'

export type RiderStage = 'ASSIGNED' | 'ARRIVED_AT_STORE' | 'PICKED_UP' | 'DELIVERED'

export type ActiveDelivery = {
  id: string
  orderNumber: string
  status: string
  riderStage: RiderStage
  shopName: string
  shopAddress: string
  shopLat: number
  shopLng: number
  destLat: number | null
  destLng: number | null
  deliveryAddress: string
  payoutInr: number
}

async function rabbitorFetch<T>(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const token = await mintApiAccessToken(userId)
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false) {
    const err = json.error
    const message =
      typeof err === 'string'
        ? err
        : typeof err === 'object' && err && 'message' in err
          ? String((err as { message: string }).message)
          : 'Request failed'
    return { ok: false, error: message }
  }
  return { ok: true, data: json.data as T }
}

export async function getRiderRealtimeAuthAction() {
  try {
    const session = await requireSession(['RABBITOR', 'ADMIN'])
    const token = await mintApiAccessToken(session.userId)
    return { ok: true as const, token, riderId: session.userId }
  } catch (err) {
    return { ok: false as const, error: (err as Error).message }
  }
}

export async function setRiderDutyAction(isOnline: boolean) {
  try {
    const session = await requireSession(['RABBITOR', 'ADMIN'])
    const result = await rabbitorFetch<{ isAvailable: boolean }>(
      session.userId,
      '/api/v1/rabbitor/availability',
      { method: 'PATCH', body: JSON.stringify({ isAvailable: isOnline }) },
    )
    if (!result.ok) return result
    revalidatePath('/delivery/orders')
    return { ok: true as const, isOnline: result.data.isAvailable }
  } catch (err) {
    return { ok: false as const, error: (err as Error).message }
  }
}

export async function getActiveDeliveryAction(): Promise<ActiveDelivery | null> {
  try {
    const session = await requireSession(['RABBITOR', 'ADMIN'])
    const result = await rabbitorFetch<ActiveDelivery | null>(
      session.userId,
      '/api/v1/rabbitor/active-delivery',
    )
    return result.ok ? result.data : null
  } catch {
    return null
  }
}

export async function acceptDeliveryOfferAction(orderId: string) {
  try {
    const session = await requireSession(['RABBITOR', 'ADMIN'])
    const result = await rabbitorFetch<ActiveDelivery>(
      session.userId,
      `/api/v1/rabbitor/offers/${orderId}/accept`,
      { method: 'POST' },
    )
    if (!result.ok) return result
    revalidatePath('/delivery/orders')
    return { ok: true as const, delivery: result.data }
  } catch (err) {
    return { ok: false as const, error: (err as Error).message }
  }
}

export async function updateRiderStageAction(orderId: string, stage: RiderStage) {
  try {
    const session = await requireSession(['RABBITOR', 'ADMIN'])
    const result = await rabbitorFetch<{ orderId: string; stage: RiderStage; status: string }>(
      session.userId,
      `/api/v1/rabbitor/orders/${orderId}/stage`,
      { method: 'PATCH', body: JSON.stringify({ stage }) },
    )
    if (!result.ok) return result
    revalidatePath('/delivery/orders')
    revalidatePath('/delivery/navigate')
    return { ok: true as const, ...result.data }
  } catch (err) {
    return { ok: false as const, error: (err as Error).message }
  }
}

export async function getAvailableDeliveryOrdersAction() {
  const session = await requireSession(['RABBITOR', 'ADMIN'])

  const orders = await prisma.order.findMany({
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
    riderTip: o.riderTip,
    itemCount: o._count.items,
    isAssigned: o.deliveryPartnerId === session.userId,
    destLat: o.destLatitude,
    destLng: o.destLongitude,
  }))
}

export async function acceptDeliveryOrderAction(orderId: string) {
  return acceptDeliveryOfferAction(orderId)
}
