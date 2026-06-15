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
  deliveryInstruction: string | null
  customerPhone: string | null
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
    if (result.ok && result.data) return result.data

    const order = await prisma.order.findFirst({
      where: {
        deliveryPartnerId: session.userId,
        status: { in: ['PREPARING', 'OUT_FOR_DELIVERY'] },
      },
      include: {
        shop: { select: { name: true, address: true, latitude: true, longitude: true } },
        customer: { select: { phone: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    if (!order) return null

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      riderStage: 'ASSIGNED',
      shopName: order.shop.name,
      shopAddress: order.shop.address,
      shopLat: order.shop.latitude,
      shopLng: order.shop.longitude,
      destLat: order.destLatitude,
      destLng: order.destLongitude,
      deliveryAddress: order.deliveryAddress,
      deliveryInstruction: order.deliveryInstruction,
      customerPhone: order.customer.phone,
      payoutInr: order.deliveryFee + order.riderTip,
    }
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
      shop: { select: { name: true, latitude: true, longitude: true, address: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })

  type JobLeg = {
    id: string
    orderNumber: string
    shopName: string
    shopAddress: string
    shopLat: number
    shopLng: number
    deliveryFee: number
    riderTip: number
    itemCount: number
    status: string
    isAssigned: boolean
  }

  const legs: JobLeg[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    shopName: o.shop.name,
    shopAddress: o.shop.address,
    shopLat: o.shop.latitude,
    shopLng: o.shop.longitude,
    deliveryFee: o.deliveryFee,
    riderTip: o.riderTip,
    itemCount: o._count.items,
    status: o.status,
    isAssigned: o.deliveryPartnerId === session.userId,
  }))

  const bundleMap = new Map<string, { key: string; legs: JobLeg[]; parentOrderId: string | null }>()
  for (const order of orders) {
    const leg = legs.find((l) => l.id === order.id)!
    const key = order.parentOrderId ?? order.id
    const existing = bundleMap.get(key)
    if (existing) {
      existing.legs.push(leg)
    } else {
      bundleMap.set(key, { key, legs: [leg], parentOrderId: order.parentOrderId })
    }
  }

  return Array.from(bundleMap.values()).map((bundle) => {
    const totalFee = bundle.legs.reduce((s, l) => s + l.deliveryFee + l.riderTip, 0)
    const totalItems = bundle.legs.reduce((s, l) => s + l.itemCount, 0)
    const isMultiStore = bundle.legs.length > 1
    const isAssigned = bundle.legs.every((l) => l.isAssigned)
    const first = bundle.legs[0]!
    const distanceKm =
      bundle.legs.length > 1
        ? Number((2.4 + bundle.legs.length * 1.8).toFixed(1))
        : Number((1.2 + Math.random() * 2.5).toFixed(1))

    return {
      id: bundle.key,
      orderNumber: isMultiStore ? `Multi · ${first.orderNumber}` : first.orderNumber,
      status: first.status,
      shopName: isMultiStore
        ? `${bundle.legs.length} store pickups`
        : first.shopName,
      shops: bundle.legs.map((l) => l.shopName),
      deliveryFee: totalFee,
      itemCount: totalItems,
      isAssigned,
      isMultiStore,
      legCount: bundle.legs.length,
      distanceKm,
      acceptOrderId: first.id,
      legs: bundle.legs,
    }
  })
}

export async function acceptDeliveryOrderAction(orderId: string) {
  return acceptDeliveryOfferAction(orderId)
}
