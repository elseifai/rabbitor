'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@rabbit/database'
import { prisma } from '@/lib/prisma'
import { clearSession, requireSession } from '@/lib/auth'
import { canTransition, generateOrderNumber, ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import { calculateDeliveryFee, distanceKm } from '@/lib/geo'
import {
  broadcastAssignRider,
  broadcastNewMerchantOrder,
  broadcastOrderEvent,
} from '@/lib/order-events'
import { getCatalogProductName } from '@/lib/shop-catalog'
import type { OrderStatus } from '@rabbit/database'

export async function placeOrderAction(input: {
  shopId: string
  items: { productId: string; quantity: number }[]
  address: {
    line1: string
    line2?: string
    city: string
    pincode: string
    latitude: number
    longitude: number
  }
  riderTip?: number
  deliveryInstruction?: string
}) {
  try {
    return await placeOrder(input)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not place order'
    if (/log in|session expired|access denied/i.test(message)) {
      return { ok: false as const, error: message }
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2003'
    ) {
      await clearSession()
      return { ok: false as const, error: 'Your session expired. Please log in again.' }
    }
    console.error('placeOrderAction failed:', err)
    return { ok: false as const, error: 'Could not place order. Please try again.' }
  }
}

async function placeOrder(input: {
  shopId: string
  items: { productId: string; quantity: number }[]
  address: {
    line1: string
    line2?: string
    city: string
    pincode: string
    latitude: number
    longitude: number
  }
  riderTip?: number
  deliveryInstruction?: string
}) {
  const session = await requireSession(['CUSTOMER', 'ADMIN', 'VENDOR'])

  const shop = await prisma.shop.findFirst({
    where: { OR: [{ id: input.shopId }, { slug: input.shopId }] },
    include: { products: true },
  })
  if (!shop) return { ok: false as const, error: 'Shop not found' }
  if (!shop.isActive) return { ok: false as const, error: 'Shop is currently closed' }

  let totalPrice = 0
  const lineItems: { productId: string; quantity: number; price: number }[] = []

  for (const item of input.items) {
    const catalogName = getCatalogProductName(item.productId)
    const product =
      shop.products.find((p) => p.id === item.productId) ??
      (catalogName ? shop.products.find((p) => p.name === catalogName) : undefined)

    if (!product || !product.isAvailable)
      return { ok: false as const, error: `Unavailable: ${catalogName ?? item.productId}` }
    if (product.stock < item.quantity)
      return { ok: false as const, error: `Insufficient stock for ${product.name}` }
    totalPrice += product.price * item.quantity
    lineItems.push({
      productId: product.id,
      quantity: item.quantity,
      price: product.price,
    })
  }

  const dist = distanceKm(
    input.address.latitude,
    input.address.longitude,
    shop.latitude,
    shop.longitude,
  )
  const deliveryFee = calculateDeliveryFee(shop.baseDeliveryFee, dist, totalPrice)

  if (totalPrice < shop.minOrderValue) {
    return { ok: false as const, error: `Minimum order is ₹${shop.minOrderValue}` }
  }

  const addressStr = [input.address.line1, input.address.line2, input.address.city, input.address.pincode]
    .filter(Boolean)
    .join(', ')
  const riderTip = input.riderTip ?? 0

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: session.userId,
        shopId: shop.id,
        status: 'PENDING',
        totalPrice,
        deliveryFee,
        riderTip,
        deliveryInstruction: input.deliveryInstruction?.trim() || null,
        deliveryAddress: addressStr,
        destLatitude: input.address.latitude,
        destLongitude: input.address.longitude,
        items: { create: lineItems },
        statusHistory: { create: { status: 'PENDING', note: 'Order placed' } },
      },
    })

    for (const item of lineItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }
    return created
  })

  await broadcastNewMerchantOrder(order.id)

  revalidatePath('/orders')
  revalidatePath('/merchant/orders')
  return { ok: true as const, orderId: order.id, orderNumber: order.orderNumber }
}

export async function getOrderAction(orderId: string) {
  let session
  try {
    session = await requireSession()
  } catch {
    return null
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      OR: [
        { customerId: session.userId },
        { shop: { ownerId: session.userId } },
      ],
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shop: { select: { name: true, slug: true, latitude: true, longitude: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!order) return null

  return {
    ...order,
    items: order.items.map((i) => ({
      ...i,
      name: i.product.name,
    })),
  }
}

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
  note?: string,
) {
  const session = await requireSession(['VENDOR', 'ADMIN', 'RABBITOR'])

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shop: true },
  })
  if (!order) return { ok: false as const, error: 'Order not found' }

  if (session.role === 'VENDOR' && order.shop.ownerId !== session.userId) {
    return { ok: false as const, error: 'Access denied' }
  }

  if (!canTransition(order.status, status)) {
    return { ok: false as const, error: `Cannot move from ${order.status} to ${status}` }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      statusHistory: {
        create: { status, note: note?.trim() || `Updated by ${session.role}` },
      },
    },
  })

  await broadcastOrderEvent(orderId, { type: 'status', status: ORDER_STATUS_LABELS[status] })

  if (status === 'OUT_FOR_DELIVERY') {
    await broadcastAssignRider(orderId)
  }

  revalidatePath('/merchant/orders')
  revalidatePath('/delivery/orders')
  revalidatePath(`/orders/${orderId}`)
  return { ok: true as const }
}

export async function getMerchantOrdersAction() {
  const session = await requireSession(['VENDOR', 'ADMIN'])
  const shops = await prisma.shop.findMany({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (shops.length === 0) return []

  const orders = await prisma.order.findMany({
    where: {
      shopId: { in: shops.map((s) => s.id) },
      status: {
        in: ['PENDING', 'ACCEPTED_BY_SHOP', 'PREPARING', 'OUT_FOR_DELIVERY'],
      },
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shop: { select: { id: true, name: true } },
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    shopId: o.shop.id,
    shopName: o.shop.name,
    customerPhone: o.customer.phone?.replace(/\d(?=\d{4})/g, '•') ?? '',
    customerName: o.customer.name ?? 'Customer',
    totalPrice: o.totalPrice + o.deliveryFee,
    subtotal: o.totalPrice,
    deliveryFee: o.deliveryFee,
    deliveryInstruction: o.deliveryInstruction,
    itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
    })),
  }))
}
