import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateOrderNumber } from '@/lib/order-pipeline'
import { getCatalogProductName } from '@/lib/shop-catalog'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      shopId,
      itemTotal,
      deliveryFee,
      riderTip = 0,
      address,
      instruction,
      items,
      destLatitude = 19.076,
      destLongitude = 72.8777,
      couponCode,
    } = body as {
      shopId: string
      itemTotal?: number
      deliveryFee?: number
      riderTip?: number
      address: string
      instruction?: string
      items: { productId: string; quantity: number; price: number }[]
      destLatitude?: number
      destLongitude?: number
      couponCode?: string
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

    const customerId = session.userId

    const shop = await prisma.shop.findFirst({
      where: { OR: [{ id: shopId }, { slug: shopId }] },
      include: { products: true },
    })

    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 })
    }

    if (!shop.isActive) {
      return NextResponse.json({ success: false, error: 'Shop is currently closed' }, { status: 400 })
    }

    let verifiedTotal = 0
    const lineItems: { productId: string; quantity: number; price: number }[] = []

    for (const item of items) {
      const catalogName = getCatalogProductName(item.productId)
      const product =
        shop.products.find((p) => p.id === item.productId) ??
        (catalogName ? shop.products.find((p) => p.name === catalogName) : undefined)

      if (!product || !product.isAvailable) {
        return NextResponse.json(
          { success: false, error: `Unavailable: ${catalogName ?? item.productId}` },
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
          customerId,
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
          items: { create: lineItems },
          statusHistory: {
            create: { status: 'PENDING', note: 'Order placed via checkout API' },
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

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
