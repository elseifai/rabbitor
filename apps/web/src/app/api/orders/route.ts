import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, resolveSessionUser, clearSession } from '@/lib/auth'
import { generateOrderNumber } from '@/lib/order-pipeline'
import {
  resolveShop,
  resolveProductForShop,
  productUnavailableMessage,
} from '@/lib/resolve-cart-product'
import { broadcastNewMerchantOrder } from '@/lib/order-events'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      shopId,
      deliveryFee,
      riderTip = 0,
      address,
      instruction,
      items,
      destLatitude = 19.076,
      destLongitude = 72.8777,
      couponCode,
      paymentMethod = 'cod',
    } = body as {
      shopId: string
      deliveryFee?: number
      riderTip?: number
      address: string
      instruction?: string
      items: { productId: string; quantity: number; price: number }[]
      destLatitude?: number
      destLongitude?: number
      couponCode?: string
      paymentMethod?: 'cod' | 'upi' | 'card'
    }

    if (!shopId || !items?.length || !address) {
      return NextResponse.json(
        { success: false, error: 'shopId, items, and address are required' },
        { status: 400 },
      )
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Please log in to place an order.' },
        { status: 401 },
      )
    }

    const customer = await resolveSessionUser(session)
    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your session expired. Please log in again to place an order.',
        },
        { status: 401 },
      )
    }

    const shop = await resolveShop(shopId)

    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })
    }

    if (!shop.isActive) {
      return NextResponse.json({ success: false, error: 'Shop is currently closed' }, { status: 400 })
    }

    let verifiedTotal = 0
    const lineItems: { productId: string; quantity: number; price: number }[] = []

    for (const item of items) {
      const product = await resolveProductForShop(shop.id, item.productId, shop.products)

      if (!product || !product.isAvailable) {
        return NextResponse.json(
          { success: false, error: productUnavailableMessage(item.productId, product?.name) },
          { status: 400 },
        )
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${product.name}` },
          { status: 400 },
        )
      }

      verifiedTotal += product.price * item.quantity
      lineItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      })
    }

    if (verifiedTotal < shop.minOrderValue) {
      return NextResponse.json(
        { success: false, error: `Minimum order is ₹${shop.minOrderValue}` },
        { status: 400 },
      )
    }

    const resolvedDeliveryFee = deliveryFee ?? 35
    const resolvedTip = Math.max(0, riderTip ?? 0)
    const isCod = paymentMethod === 'cod'

    const newOrder = await prisma.$transaction(async (tx) => {
      let appliedCouponCode: string | undefined
      let discountAmount = 0
      let orderItemTotal = verifiedTotal

      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.trim().toUpperCase() },
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

        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        })
      }

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: customer.id,
          shopId: shop.id,
          totalPrice: orderItemTotal,
          deliveryFee: resolvedDeliveryFee,
          riderTip: resolvedTip,
          deliveryAddress: address,
          deliveryInstruction: instruction?.trim() || null,
          destLatitude,
          destLongitude,
          appliedCouponCode,
          discountAmount,
          status: 'PENDING',
          paymentStatus: isCod ? 'PENDING' : 'PENDING',
          items: { create: lineItems },
          statusHistory: {
            create: {
              status: 'PENDING',
              note: isCod ? 'COD order placed' : 'Order placed',
            },
          },
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

    await broadcastNewMerchantOrder(newOrder.id)

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
    })
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Order creation failed'
    const message = raw.includes('Foreign key constraint')
      ? 'Your session expired. Please log in again to place an order.'
      : raw
    const status = message.includes('log in again') ? 401 : 500
    if (status === 401) await clearSession().catch(() => {})
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
