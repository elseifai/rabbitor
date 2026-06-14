import crypto from 'crypto'
import Razorpay from 'razorpay'
import type { PaymentIntent } from '@rabbit/database'
import { prisma } from '@/lib/prisma'
import {
  type CheckoutInput,
  createPaidOrderFromCheckout,
  parseValidatedCheckoutFromIntent,
  validateCheckoutInput,
} from '@/lib/checkout-order'

const razorpayKeyId = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ''
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET ?? ''
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''

export const PAYMENT_INTENT_TTL_MS = 15 * 60 * 1000
const RAZORPAY_MIN_PAISE = 100

export function isRazorpayConfigured(): boolean {
  return Boolean(razorpayKeyId && razorpayKeySecret)
}

function getRazorpayClient(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured')
  }
  return new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  })
}

export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean {
  if (!razorpayKeySecret) return false
  const expectedSignature = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')
  return expectedSignature === razorpaySignature
}

export function verifyRazorpayWebhookSignature(body: string, signature: string): boolean {
  if (!razorpayWebhookSecret) return false
  const expected = crypto.createHmac('sha256', razorpayWebhookSecret).update(body).digest('hex')
  return expected === signature
}

function toRazorpayAmountPaise(grandTotal: number): number {
  const amountPaise = Math.round(grandTotal * 100)
  if (!Number.isFinite(amountPaise) || amountPaise < RAZORPAY_MIN_PAISE) {
    throw new Error('Order total must be at least ₹1 to proceed with payment')
  }
  return amountPaise
}

export async function expireStalePaymentIntents(): Promise<number> {
  const result = await prisma.paymentIntent.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'EXPIRED',
      failureReason: 'Payment window expired',
    },
  })
  return result.count
}

async function expireCustomerPendingIntents(customerId: string): Promise<void> {
  await prisma.paymentIntent.updateMany({
    where: {
      customerId,
      status: 'PENDING',
    },
    data: {
      status: 'EXPIRED',
      failureReason: 'Superseded by a new checkout attempt',
    },
  })
}

async function checkoutFromIntent(intent: PaymentIntent) {
  if (intent.shopsJson) {
    return parseValidatedCheckoutFromIntent(intent.shopsJson)
  }

  if (intent.isMultiShop) {
    throw new Error('Invalid multi-shop payment intent snapshot')
  }

  return validateCheckoutInput({
    shopId: intent.shopId,
    deliveryFee: intent.deliveryFee,
    riderTip: intent.riderTip,
    address: intent.deliveryAddress,
    instruction: intent.deliveryInstruction ?? undefined,
    destLatitude: intent.destLatitude ?? undefined,
    destLongitude: intent.destLongitude ?? undefined,
    couponCode: intent.appliedCouponCode ?? undefined,
    items: Array.isArray(intent.itemsJson)
      ? (intent.itemsJson as { productId: string; quantity: number; price: number }[])
      : [],
  })
}

export async function createPaymentIntent(customerId: string, input: CheckoutInput) {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured')
  }

  await expireStalePaymentIntents()
  await expireCustomerPendingIntents(customerId)

  const checkout = await validateCheckoutInput(input)
  const expiresAt = new Date(Date.now() + PAYMENT_INTENT_TTL_MS)
  const amountPaise = toRazorpayAmountPaise(checkout.grandTotal)

  const flatItems = checkout.shops.flatMap((shop) => shop.lineItems)

  const intent = await prisma.paymentIntent.create({
    data: {
      customerId,
      shopId: checkout.primaryShopId,
      status: 'PENDING',
      totalPrice: checkout.orderItemTotal,
      deliveryFee: checkout.totalDeliveryFee,
      riderTip: checkout.riderTip,
      discountAmount: checkout.discountAmount,
      appliedCouponCode: checkout.appliedCouponCode,
      deliveryAddress: checkout.address,
      deliveryInstruction: checkout.instruction ?? null,
      destLatitude: checkout.destLatitude,
      destLongitude: checkout.destLongitude,
      itemsJson: flatItems,
      isMultiShop: checkout.isMultiShop,
      shopsJson: checkout as unknown as object,
      expiresAt,
    },
  })

  const razorpay = getRazorpayClient()
  const razorpayOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: intent.id.slice(0, 36),
    notes: {
      paymentIntentId: intent.id,
      customerId,
      shopCount: String(checkout.shops.length),
    },
  })

  const updated = await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: { razorpayOrderId: razorpayOrder.id },
  })

  return {
    intentId: updated.id,
    razorpayOrderId: razorpayOrder.id,
    amount: amountPaise,
    currency: 'INR' as const,
    key: razorpayKeyId,
    expiresAt: updated.expiresAt.toISOString(),
    shopCount: checkout.shops.length,
    grandTotal: checkout.grandTotal,
  }
}

export async function markPaymentIntentFailed(
  intentId: string,
  customerId: string,
  reason: string,
) {
  const intent = await prisma.paymentIntent.findFirst({
    where: { id: intentId, customerId },
  })
  if (!intent) throw new Error('Payment intent not found')
  if (intent.status !== 'PENDING') return intent

  return prisma.paymentIntent.update({
    where: { id: intent.id },
    data: {
      status: 'FAILED',
      failureReason: reason.slice(0, 500),
    },
  })
}

export async function confirmPaymentIntent(params: {
  customerId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) {
  const { customerId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params

  if (!verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    throw new Error('Invalid payment signature')
  }

  const intent = await prisma.paymentIntent.findFirst({
    where: { razorpayOrderId, customerId },
  })
  if (!intent) throw new Error('Payment intent not found')

  if (intent.status === 'COMPLETED') {
    const existingOrder = await prisma.order.findFirst({
      where: { paymentIntentId: intent.id },
    })
    if (existingOrder) return { intent, order: existingOrder }
  }

  if (intent.status !== 'PENDING') {
    throw new Error(
      intent.status === 'EXPIRED'
        ? 'Payment window expired. Please try checkout again.'
        : 'This payment attempt is no longer valid.',
    )
  }

  if (intent.expiresAt <= new Date()) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'EXPIRED', failureReason: 'Payment window expired' },
    })
    throw new Error('Payment window expired. Please try checkout again.')
  }

  const checkout =
    intent.shopsJson != null
      ? parseValidatedCheckoutFromIntent(intent.shopsJson)
      : await checkoutFromIntent(intent)

  const order = await createPaidOrderFromCheckout({
    customerId,
    checkout,
    paymentIntentId: intent.id,
    razorpayOrderId,
    razorpayPaymentId,
  })

  const updatedIntent = await prisma.paymentIntent.findUniqueOrThrow({
    where: { id: intent.id },
  })

  return { intent: updatedIntent, order }
}

export async function handleRazorpayWebhookEvent(event: string, payload: Record<string, unknown>) {
  if (event === 'payment.failed') {
    const payment = payload.payment as { entity?: { order_id?: string; error_description?: string } }
    const orderId = payment?.entity?.order_id
    if (!orderId) return { handled: false }

    await prisma.paymentIntent.updateMany({
      where: { razorpayOrderId: orderId, status: 'PENDING' },
      data: {
        status: 'FAILED',
        failureReason: payment.entity?.error_description ?? 'Payment failed',
      },
    })
    return { handled: true }
  }

  if (event === 'payment.captured') {
    const payment = payload.payment as {
      entity?: { order_id?: string; id?: string }
    }
    const razorpayOrderId = payment?.entity?.order_id
    const razorpayPaymentId = payment?.entity?.id
    if (!razorpayOrderId || !razorpayPaymentId) return { handled: false }

    const intent = await prisma.paymentIntent.findFirst({
      where: { razorpayOrderId, status: 'PENDING' },
    })
    if (!intent || intent.expiresAt <= new Date()) return { handled: false }

    const checkout =
      intent.shopsJson != null
        ? parseValidatedCheckoutFromIntent(intent.shopsJson)
        : await checkoutFromIntent(intent)

    const order = await createPaidOrderFromCheckout({
      customerId: intent.customerId,
      checkout,
      paymentIntentId: intent.id,
      razorpayOrderId,
      razorpayPaymentId,
    })
    return { handled: true, orderId: order.id }
  }

  return { handled: false }
}
