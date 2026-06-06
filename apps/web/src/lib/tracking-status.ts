import type { OrderStatus } from '@rabbit/database'

export const TRACKING_TIMELINE_STEPS = [
  {
    status: 'PENDING',
    title: 'Order Placed',
    desc: 'Waiting for store confirmation',
  },
  {
    status: 'PREPARING',
    title: 'Items Being Packed',
    desc: 'Shop is picking and packing your order',
  },
  {
    status: 'ON_THE_WAY',
    title: 'Out for Delivery',
    desc: 'Our Rabbit rider is racing to you',
  },
  {
    status: 'ARRIVED',
    title: 'Arrived at Location',
    desc: 'Enjoy your fresh order!',
  },
] as const

export function orderStatusToStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'PENDING':
      return 0
    case 'ACCEPTED_BY_SHOP':
    case 'PREPARING':
      return 1
    case 'OUT_FOR_DELIVERY':
      return 2
    case 'DELIVERED':
      return 3
    default:
      return 0
  }
}

export function labelToOrderStatus(label: string): OrderStatus | null {
  const map: Record<string, OrderStatus> = {
    'Order placed': 'PENDING',
    'Accepted by shop': 'ACCEPTED_BY_SHOP',
    'Items being packed': 'PREPARING',
    'Out for delivery': 'OUT_FOR_DELIVERY',
    Delivered: 'DELIVERED',
    Cancelled: 'CANCELLED',
  }
  return map[label] ?? null
}

export const TRACKING_BY_STATUS_LABEL: Record<
  string,
  { pct: number; eta: number; msg: string }
> = {
  'Order placed': {
    pct: 15,
    eta: 12,
    msg: 'Waiting for the shop to confirm your order...',
  },
  'Accepted by shop': {
    pct: 30,
    eta: 10,
    msg: 'Shop accepted your order! Packing your items now.',
  },
  'Items being packed': {
    pct: 45,
    eta: 8,
    msg: 'Your items are being packed at the shop.',
  },
  'Out for delivery': {
    pct: 75,
    eta: 4,
    msg: 'Rider is sprinting through your neighborhood!',
  },
  Delivered: {
    pct: 100,
    eta: 0,
    msg: 'Rider has arrived at your gate! 🎉',
  },
  Cancelled: {
    pct: 0,
    eta: 0,
    msg: 'Order was cancelled.',
  },
}

export function trackingFromStatusLabel(label: string) {
  return (
    TRACKING_BY_STATUS_LABEL[label] ?? {
      pct: 15,
      eta: 12,
      msg: label,
    }
  )
}

export function trackingFromOrderStatus(status: OrderStatus) {
  const label =
    {
      PENDING: 'Order placed',
      ACCEPTED_BY_SHOP: 'Accepted by shop',
      PREPARING: 'Items being packed',
      OUT_FOR_DELIVERY: 'Out for delivery',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    }[status] ?? 'Order placed'
  return trackingFromStatusLabel(label)
}
