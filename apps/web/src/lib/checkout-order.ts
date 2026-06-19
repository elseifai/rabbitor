import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/order-pipeline'
import {
  resolveShop,
  resolveProductForShop,
  productUnavailableMessage,
} from '@/lib/resolve-cart-product'
import { broadcastNewMerchantOrder } from '@/lib/order-events'
import { calculateDeliveryFee, distanceKm } from '@/lib/geo'
import { getPlatformSettings } from '@/lib/platform-settings'

export type CheckoutLineItem = { productId: string; quantity: number; price: number }

export type ShopCheckoutInput = {
  shopId: string
  items: CheckoutLineItem[]
}

/** Supports legacy single-shop and multi-shop grouped payloads. */
export type CheckoutInput = {
  address: string
  instruction?: string
  destLatitude?: number
  destLongitude?: number
  riderTip?: number
  couponCode?: string
  deliveryFee?: number
  /** Legacy single-shop */
  shopId?: string
  items?: CheckoutLineItem[]
  /** Multi-store grouped checkout */
  shops?: ShopCheckoutInput[]
}

export type ShopFulfillment = {
  shopId: string
  shopName: string
  lineItems: CheckoutLineItem[]
  orderItemTotal: number
  deliveryFee: number
  distanceKm: number
}

export type ValidatedCheckout = {
  shops: ShopFulfillment[]
  riderTip: number
  address: string
  instruction?: string
  destLatitude: number
  destLongitude: number
  orderItemTotal: number
  discountAmount: number
  appliedCouponCode?: string
  couponId?: string
  multiShopRoutingFee: number
  totalDeliveryFee: number
  grandTotal: number
  isMultiShop: boolean
  primaryShopId: string
}

function normalizeShopInputs(input: CheckoutInput): ShopCheckoutInput[] {
  if (input.shops?.length) {
    return input.shops.filter((s) => s.shopId && s.items?.length)
  }
  if (input.shopId && input.items?.length) {
    return [{ shopId: input.shopId, items: input.items }]
  }
  return []
}

export function parseValidatedCheckoutFromIntent(payload: unknown): ValidatedCheckout {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payment intent checkout snapshot')
  }
  return payload as ValidatedCheckout
}

export async function validateCheckoutInput(input: CheckoutInput): Promise<ValidatedCheckout> {
  const { address } = input
  const shopInputs = normalizeShopInputs(input)

  if (!address?.trim() || shopInputs.length === 0) {
    throw new Error('Address and at least one shop with items are required')
  }

  const platform = await getPlatformSettings()
  if (shopInputs.length > 1 && !platform.featureFlags.customer.multiStoreCart) {
    throw new Error('Multi-store checkout is temporarily disabled')
  }
  const destLatitude = input.destLatitude ?? 19.076
  const destLongitude = input.destLongitude ?? 72.8777
  const riderTip = Math.max(0, input.riderTip ?? 0)

  const shops: ShopFulfillment[] = []
  let orderItemTotal = 0

  for (const shopInput of shopInputs) {
    const shop = await resolveShop(shopInput.shopId)
    if (!shop) throw new Error('Shop not found')
    if (!shop.isActive) throw new Error(`${shop.name} is currently closed`)

    let shopSubtotal = 0
    const lineItems: CheckoutLineItem[] = []

    for (const item of shopInput.items) {
      const product = await resolveProductForShop(shop.id, item.productId, shop.products)
      if (!product || !product.isAvailable) {
        throw new Error(productUnavailableMessage(item.productId, product?.name))
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`)
      }
      shopSubtotal += product.price * item.quantity
      lineItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      })
    }

    if (shopSubtotal < shop.minOrderValue) {
      throw new Error(`Minimum order for ${shop.name} is ₹${shop.minOrderValue}`)
    }

    const dist = distanceKm(destLatitude, destLongitude, shop.latitude, shop.longitude)
    const deliveryFee = calculateDeliveryFee(
      shop.baseDeliveryFee,
      dist,
      shopSubtotal,
      platform.freeDeliveryThreshold,
    )

    shops.push({
      shopId: shop.id,
      shopName: shop.name,
      lineItems,
      orderItemTotal: shopSubtotal,
      deliveryFee,
      distanceKm: Math.round(dist * 10) / 10,
    })
    orderItemTotal += shopSubtotal
  }

  if (orderItemTotal < platform.globalMinCartValue) {
    throw new Error(
      `Minimum cart value of ₹${platform.globalMinCartValue} required to checkout`,
    )
  }

  let appliedCouponCode: string | undefined
  let discountAmount = 0
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
    if (orderItemTotal < coupon.minOrderValue) {
      throw new Error(`Minimum order value of ₹${coupon.minOrderValue} required for this coupon`)
    }

    if (coupon.discountType === 'FLAT') {
      discountAmount = Math.min(coupon.discountValue, orderItemTotal)
    } else {
      discountAmount = Math.min(orderItemTotal, (orderItemTotal * coupon.discountValue) / 100)
    }

    appliedCouponCode = coupon.code
    couponId = coupon.id
  }

  const perShopDeliveryTotal = shops.reduce((sum, s) => sum + s.deliveryFee, 0)
  const multiShopRoutingFee =
    shops.length > 1 ? (shops.length - 1) * platform.multiShopRoutingFeePerLeg : 0
  const totalDeliveryFee = perShopDeliveryTotal + multiShopRoutingFee
  const discountedItemsTotal = Math.max(0, orderItemTotal - discountAmount)
  const grandTotal = discountedItemsTotal + totalDeliveryFee + riderTip

  if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
    throw new Error('Order total must be greater than zero')
  }

  return {
    shops,
    riderTip,
    address: address.trim(),
    instruction: input.instruction?.trim() || undefined,
    destLatitude,
    destLongitude,
    orderItemTotal: discountedItemsTotal,
    discountAmount,
    appliedCouponCode,
    couponId,
    multiShopRoutingFee,
    totalDeliveryFee,
    grandTotal,
    isMultiShop: shops.length > 1,
    primaryShopId: shops[0]!.shopId,
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

  const existingParent = await prisma.order.findFirst({
    where: { paymentIntentId, orderKind: { in: ['STANDARD', 'PARENT'] } },
  })
  if (existingParent) return existingParent

  const result = await prisma.$transaction(async (tx) => {
    const intent = await tx.paymentIntent.findUnique({ where: { id: paymentIntentId } })
    if (!intent) throw new Error('Payment intent not found')
    if (intent.status === 'COMPLETED') {
      const linked = await tx.order.findFirst({
        where: { paymentIntentId, orderKind: { in: ['STANDARD', 'PARENT'] } },
      })
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

    for (const shop of checkout.shops) {
      for (const item of shop.lineItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product || !product.isAvailable || product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product?.name ?? 'an item'}`)
        }
      }
    }

    const isMulti = checkout.isMultiShop
    const orderKind = isMulti ? 'PARENT' : 'STANDARD'

    const parent = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        orderKind,
        customerId,
        shopId: checkout.primaryShopId,
        totalPrice: checkout.orderItemTotal,
        deliveryFee: checkout.totalDeliveryFee,
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
        statusHistory: {
          create: {
            status: 'PENDING',
            note: isMulti
              ? 'Multi-store prepaid order placed after Razorpay confirmation'
              : 'Prepaid order placed after Razorpay confirmation',
          },
        },
        ...(isMulti
          ? {}
          : {
              items: { create: checkout.shops[0]!.lineItems },
            }),
      },
    })

    const childOrders = []

    if (isMulti) {
      for (const shop of checkout.shops) {
        const child = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            orderKind: 'CHILD',
            parentOrderId: parent.id,
            customerId,
            shopId: shop.shopId,
            totalPrice: shop.orderItemTotal,
            deliveryFee: shop.deliveryFee,
            riderTip: 0,
            deliveryAddress: checkout.address,
            deliveryInstruction: checkout.instruction ?? null,
            destLatitude: checkout.destLatitude,
            destLongitude: checkout.destLongitude,
            status: 'PENDING',
            paymentStatus: 'PAID',
            items: { create: shop.lineItems },
            statusHistory: {
              create: {
                status: 'PENDING',
                note: `Fulfillment for ${shop.shopName}`,
              },
            },
          },
        })
        childOrders.push(child)
      }
    }

    for (const shop of checkout.shops) {
      for (const item of shop.lineItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
    }

    await tx.paymentIntent.update({
      where: { id: paymentIntentId },
      data: { status: 'COMPLETED' },
    })

    return { order: parent, childOrders, isNew: true as const }
  })

  if (result.isNew) {
    if (result.childOrders.length > 0) {
      for (const child of result.childOrders) {
        await broadcastNewMerchantOrder(child.id)
      }
    } else {
      await broadcastNewMerchantOrder(result.order.id)
    }
  }

  return result.order
}

export async function createCodOrderFromCheckout(params: {
  customerId: string
  checkout: ValidatedCheckout
}) {
  const { customerId, checkout } = params

  const result = await prisma.$transaction(async (tx) => {
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

    for (const shop of checkout.shops) {
      for (const item of shop.lineItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product || !product.isAvailable || product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product?.name ?? 'an item'}`)
        }
      }
    }

    const isMulti = checkout.isMultiShop
    const orderKind = isMulti ? 'PARENT' : 'STANDARD'

    const parent = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        orderKind,
        customerId,
        shopId: checkout.primaryShopId,
        totalPrice: checkout.orderItemTotal,
        deliveryFee: checkout.totalDeliveryFee,
        riderTip: checkout.riderTip,
        deliveryAddress: checkout.address,
        deliveryInstruction: checkout.instruction ?? null,
        destLatitude: checkout.destLatitude,
        destLongitude: checkout.destLongitude,
        appliedCouponCode: checkout.appliedCouponCode,
        discountAmount: checkout.discountAmount,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        statusHistory: {
          create: {
            status: 'PENDING',
            note: isMulti
              ? 'Multi-store cash on delivery order placed'
              : 'Cash on delivery order placed',
          },
        },
        ...(isMulti
          ? {}
          : {
              items: { create: checkout.shops[0]!.lineItems },
            }),
      },
    })

    const childOrders = []

    if (isMulti) {
      for (const shop of checkout.shops) {
        const child = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            orderKind: 'CHILD',
            parentOrderId: parent.id,
            customerId,
            shopId: shop.shopId,
            totalPrice: shop.orderItemTotal,
            deliveryFee: shop.deliveryFee,
            riderTip: 0,
            deliveryAddress: checkout.address,
            deliveryInstruction: checkout.instruction ?? null,
            destLatitude: checkout.destLatitude,
            destLongitude: checkout.destLongitude,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            items: { create: shop.lineItems },
            statusHistory: {
              create: {
                status: 'PENDING',
                note: `Fulfillment for ${shop.shopName}`,
              },
            },
          },
        })
        childOrders.push(child)
      }
    }

    for (const shop of checkout.shops) {
      for (const item of shop.lineItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
    }

    return { order: parent, childOrders, isNew: true as const }
  })

  if (result.childOrders.length > 0) {
    for (const child of result.childOrders) {
      await broadcastNewMerchantOrder(child.id)
    }
  } else {
    await broadcastNewMerchantOrder(result.order.id)
  }

  return result.order
}
