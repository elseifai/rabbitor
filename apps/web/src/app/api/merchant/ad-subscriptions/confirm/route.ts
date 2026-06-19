import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { planEndDate } from '@/lib/ad-subscription'
import type { AdSubscriptionPlanType } from '@rabbit/database'
import crypto from 'crypto'

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false
  const payload = `${orderId}|${paymentId}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return expected === signature
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const body = (await request.json()) as {
      planType?: AdSubscriptionPlanType
      shopId?: string
      merchantId?: string
      tierLevel?: number
      pricePaid?: number
      razorpayPaymentId?: string
      razorpayOrderId?: string
      razorpaySignature?: string
    }

    if (!body.planType || !body.shopId || !body.pricePaid) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
    }

    const shop = await prisma.shop.findFirst({
      where: { id: body.shopId, ownerId: session.userId },
      include: { vendor: true },
    })
    if (!shop?.vendor) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 })
    }

    if (body.razorpayOrderId && body.razorpayPaymentId && body.razorpaySignature) {
      const valid = verifyRazorpaySignature(
        body.razorpayOrderId,
        body.razorpayPaymentId,
        body.razorpaySignature,
      )
      if (!valid) {
        return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 })
      }
    }

    const start = new Date()
    const plan = await prisma.adSubscriptionPlan.create({
      data: {
        merchantId: shop.vendor.id,
        shopId: body.shopId,
        planType: body.planType,
        startDate: start,
        endDate: planEndDate(start, body.planType),
        tierLevel: body.tierLevel ?? 1,
        pricePaid: body.pricePaid,
        status: 'ACTIVE',
        settlementMethod: 'EXTERNAL_PAYMENT',
        settlementRef: body.razorpayPaymentId ?? null,
        settledAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Activation failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
