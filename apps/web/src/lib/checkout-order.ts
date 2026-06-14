import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/order-pipeline'
import {
  resolveShop,
  resolveProductForShop,
  productUnavailableMessage,
} from '@/lib/resolve-cart-product'
import { broadcastNewMerchantOrder } from '@/lib/order-events'

export type CheckoutLineItem = { productId: string; quantity: number; price: number }

export type CheckoutInput = {
  shopId: string
  deliveryFee?: number
  riderTip?: number
  address: string
  instruction?: string
  items: { productId: string; quantity: number; price: number }[]
  destLatitude?: number
  destLongitude?: number
  couponCode?: string
}

export type ValidatedCheckout = {
  shopId: string
  deliveryFee: number
  riderTip: number
  address: string
  instruction?: string
  destLatitude: number
  destLongitude: number
  lineItems: CheckoutLineItem[]
  orderItemTotal: number
  discountAmount: number
  appliedCouponCode?: string
  couponId?: string
  grandTotal: number
}

export async function validateCheckoutInput(input: CheckoutInput): Promise<ValidatedCheckout> {
  const { shopId, items, address } = input

  if (!shopId || !items?.length || !address?.trim()) {
    throw new Error('shopId, items, and address are required')
  }

  const shop = await resolveShop(shopId)
  if (!shop) throw new Error('Shop not found')
  if (!shop.isActive) throw new Error('Shop is currently closed')

  let verifiedTotal = 0
  const lineItems: CheckoutLineItem[] = []

  for (const item of items) {
    const product = await resolveProductForShop(shop.id, item.productId, shop.products)

    if (!product || !product.isAvailable) {
      throw new Error(productUnavailableMessage(item.productId, product?.name))
    }

    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`)
    }

    verifiedTotal += product.price * item.quantity
    lineItems.push({
      productId: product.id,
      quantity: item.quantity,
      price: product.price,
    })
  }

  if (verifiedTotal < shop.minOrderValue) {
    throw new Error(`Minimum order is ₹${shop.minOrderValue}`)
  }

  const resolvedDeliveryFee = input.deliveryFee ?? 35
  const resolvedTip = Math.max(0, input.riderTip ?? 0)
  let appliedCouponCode: string | undefined
  let discountAmount = 0
  let orderItemTotal = verifiedTotal
  let couponId: string | undefined

  if (input.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: input.couponCode.trim().toUpperCase() },
    })

    if (!coupon || !coupon.isActive) {
      throw new Error('Invalid or inactive coupon code')
    }
    if (coupon.expiresAt && coupon.expiresAt <= new Date()) {
      throw new Error('This coupon has expired')
    }
    if (coupon.usedCount >= coupon.maxUses) {
      throw new Error('This coupon has reached its usage limit')
    }
    if (verifiedTotal < coupon.minOrderValue) {
      throw new Error(`Minimum order value of ₹${coupon.minOrderValue} required for this coupon`)
    }

    if (coupon.discountType === 'FLAT') {
      discountAmount = Math.min(coupon.discountValue, verifiedTotal)
    } else {
      discountAmount = Math.min(verifiedTotal, (verifiedTotal * coupon.discountValue) / 100)
    }

    appliedCouponCode = coupon.code
    orderItemTotal = Math.max(0, verifiedTotal - discountAmount)
    couponId = coupon.id
  }

  const grandTotal = orderItemTotal + resolvedDeliveryFee + resolvedTip

  return {
    shopId: shop.id,
    deliveryFee: resolvedDeliveryFee,
    riderTip: resolvedTip,
    address: address.trim(),
    instruction: input.instruction?.trim() || undefined,
    destLatitude: input.destLatitude ?? 19.076,
    destLongitude: input.destLongitude ?? 72.8777,
    lineItems,
    orderItemTotal,
    discountAmount,
    appliedCouponCode,
    couponId,
    grandTotal,
  }
}

export async function createPaidOrderFromCheckout(params: {
  customerId: string
  checkout: ValidatedCheckout
  paymentIntentId: string
  razorpayOrderId: string
  razorpayPaymentId: string
}) {
  const { customerId, checkout, paymentIntentId, razorpayOrderId, razorpayPaymentId } = params

  const existingOrder = await prisma.order.findFirst({
    where: { paymentIntentId },
  })
  if (existingOrder) return existingOrder

  const result = await prisma.$transaction(async (tx) => {
    const intent = await tx.paymentIntent.findUnique({ where: { id: paymentIntentId } })
    if (!intent) throw new Error('Payment intent not found')
    if (intent.status === 'COMPLETED') {
      const linked = await tx.order.findFirst({ where: { paymentIntentId } })
      if (linked) return { order: linked, isNew: false as const }
    }
    if (intent.status !== 'PENDING') {
      throw new Error('This payment attempt is no longer valid.')
    }

    if (checkout.couponId) {
      const coupon = await tx.coupon.findUnique({ where: { id: checkout.couponId } })
      if (!coupon || !coupon.isActive || coupon.usedCount >= coupon.maxUses) {
        throw new Error('Coupon is no longer valid')
      }
      await tx.coupon.update({
        where: { id: checkout.couponId },
        data: { usedCount: { increment: 1 } },
      })
    }

    for (const item of checkout.lineItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (!product || !product.isAvailable || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product?.name ?? 'an item'}`)
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        shopId: checkout.shopId,
        totalPrice: checkout.orderItemTotal,
        deliveryFee: checkout.deliveryFee,
        riderTip: checkout.riderTip,
        deliveryAddress: checkout.address,
        deliveryInstruction: checkout.instruction ?? null,
        destLatitude: checkout.destLatitude,
        destLongitude: checkout.destLongitude,
        appliedCouponCode: checkout.appliedCouponCode,
        discountAmount: checkout.discountAmount,
        status: 'PENDING',
        paymentStatus: 'PAID',
        razorpayOrderId,
        razorpayPaymentId,
        paymentIntentId,
        items: { create: checkout.lineItems },
        statusHistory: {
          create: { status: 'PENDING', note: 'Prepaid order placed after Razorpay confirmation' },
        },
      },
    })

    for (const item of checkout.lineItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    await tx.paymentIntent.update({
      where: { id: paymentIntentId },
      data: { status: 'COMPLETED' },
    })

    return { order: created, isNew: true as const }
  })

  if (result.isNew) {
    await broadcastNewMerchantOrder(result.order.id)
  }

  return result.order
}
