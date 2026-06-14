import crypto from 'crypto'
import Razorpay from 'razorpay'
import { prisma } from './prisma'
import { confirmPaymentIntent, isRazorpayConfigured } from './payment-intent-server'

const razorpayKeyId = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ''
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET ?? ''

function getRazorpayClient(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured')
  }
  return new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  })
}

export async function assertCustomerOwnsOrder(orderId: string, customerId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new Error('Order not found')
  if (order.customerId !== customerId) throw new Error('Order does not belong to this customer')
  return order
}

/** @deprecated Use payment-intent flow instead of order-first payments. */
export async function createRazorpayOrder(orderId: string, amount: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new Error('Order not found')
  if (order.paymentStatus === 'PAID') throw new Error('Order is already paid')

  const amountPaise = Math.round(amount * 100)
  const razorpay = getRazorpayClient()

  const razorpayOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: order.orderNumber,
    notes: { orderId: order.id },
  })

  await prisma.order.update({
    where: { id: orderId },
    data: {
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: 'PENDING',
    },
  })

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: amountPaise,
    currency: 'INR' as const,
    key: razorpayKeyId,
  }
}

/** @deprecated Use confirmPaymentIntent from payment-intent-server. */
export async function verifyPayment(
  customerId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
) {
  const { order } = await confirmPaymentIntent({
    customerId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  })
  return order
}

export function verifyRazorpayPaymentSignatureLegacy(
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
