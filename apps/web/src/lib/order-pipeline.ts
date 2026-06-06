import type { OrderStatus } from '@rabbit/database'

export const ORDER_PIPELINE: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED_BY_SHOP', 'CANCELLED'],
  ACCEPTED_BY_SHOP: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Order placed',
  ACCEPTED_BY_SHOP: 'Accepted by shop',
  PREPARING: 'Items being packed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export const CUSTOMER_TRACK_STEPS: OrderStatus[] = [
  'PENDING',
  'ACCEPTED_BY_SHOP',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_PIPELINE[from]?.includes(to) ?? false
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RBT-${ts}-${rand}`
}

/** Map URL category slug → Shop.category value */
export const CATEGORY_SLUG_MAP: Record<string, string> = {
  groceries: 'Kirana',
  'fresh-fish': 'Fish Shop',
  footwear: 'Footwear',
  clothing: 'Clothing',
  vegetables: 'Vegetables',
  pharmacy: 'Pharmacy',
}
