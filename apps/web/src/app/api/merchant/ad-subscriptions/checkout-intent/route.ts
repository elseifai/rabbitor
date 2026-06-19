import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { isRazorpayConfigured } from '@/lib/payment-intent-server'
import type { AdSubscriptionPlanType } from '@rabbit/database'

export async function POST(request: Request) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const body = (await request.json()) as {
      planType?: AdSubscriptionPlanType
      amount?: number
      shopId?: string
      merchantId?: string
      tierLevel?: number
    }

    if (!body.planType || !body.shopId || !body.amount) {
      return NextResponse.json({ success: false, error: 'Missing plan details' }, { status: 400 })
    }

    const shop = await prisma.shop.findFirst({
      where: { id: body.shopId, ownerId: session.userId },
      include: { vendor: true },
    })
    if (!shop?.vendor) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 })
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json({
        success: false,
        fallback: true,
        error: 'Payment gateway offline — plan queued for admin activation',
      })
    }

    const Razorpay = (await import('razorpay')).default
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const amountPaise = Math.round(body.amount * 100)
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `ad-${body.planType.toLowerCase()}-${Date.now().toString(36)}`,
      notes: {
        shopId: body.shopId,
        merchantId: shop.vendor.id,
        planType: body.planType,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        razorpayKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: order.id,
        amountPaise,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
