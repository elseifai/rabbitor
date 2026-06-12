import { ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import type { OrderStatus } from '@rabbit/database'

// PLATFORM CORE RESOLUTION — lightweight rule-engine for support chatbot
export type SupportOrderSnapshot = {
  orderNumber: string
  status: OrderStatus
  shopName: string
  grandTotal: number
  createdAt: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'bot'
  text: string
  ts: number
}

const STORE_HOURS = 'Most Rabbit partner stores operate 7:00 AM – 10:00 PM. Fish and meat counters may open earlier; pharmacy partners often run 24/7.'

function normalize(input: string): string {
  return input.trim().toLowerCase()
}

export function buildSupportReply(
  userMessage: string,
  latestOrder?: SupportOrderSnapshot | null,
): string {
  const q = normalize(userMessage)

  if (!q) {
    return 'Hi! I\'m Rabbit Support. Ask about placing an order, store hours, or your latest delivery status.'
  }

  if (/place an order|how to order|order kaise|buy from/.test(q)) {
    return [
      'To place an order:',
      '1. Set your delivery location on Profile or Home.',
      '2. Browse a neighbourhood shop and add items to cart.',
      '3. Checkout with your address and payment method.',
      '4. Track live status under My Orders.',
    ].join('\n')
  }

  if (/hour|timing|open|close|operating/.test(q)) {
    return STORE_HOURS
  }

  if (/track|status|where is|delivery|my order|rbt-/.test(q)) {
    if (!latestOrder) {
      return 'I couldn\'t find a recent order on your account. Place an order first, then ask me "Where is my order?" for live status.'
    }
    const statusLine = ORDER_STATUS_LABELS[latestOrder.status] ?? latestOrder.status
    const diagnostics: Record<OrderStatus, string> = {
      PENDING: 'waiting for the merchant to accept',
      ACCEPTED_BY_SHOP: 'accepted — the merchant will start packing soon',
      PREPARING: 'currently being packed by the merchant',
      OUT_FOR_DELIVERY: 'on the way with your Rabbitor partner',
      DELIVERED: 'delivered — thank you for shopping local!',
      CANCELLED: 'cancelled. Contact the shop if this was unexpected.',
    }
    const detail = diagnostics[latestOrder.status] ?? statusLine
    return `Your order **${latestOrder.orderNumber}** from **${latestOrder.shopName}** is ${detail}.\n\nStatus: ${statusLine}`
  }

  if (/refund|cancel|problem|issue|help/.test(q)) {
    return 'For refunds or order issues, open My Orders, select the order, and use the support option — or reply here with your order number (RBT-…).'
  }

  if (/hello|hi|hey|namaste/.test(q)) {
    return 'Hello! How can I help you today? Try: "How do I place an order?", "What are store hours?", or "Where is my order?"'
  }

  return 'I can help with placing orders, store hours, and order tracking. Try asking "How do I place an order?" or "Where is my order?"'
}

export const SUPPORT_QUICK_PROMPTS = [
  'How do I place an order?',
  'What are the store operating hours?',
  'Where is my order?',
] as const
