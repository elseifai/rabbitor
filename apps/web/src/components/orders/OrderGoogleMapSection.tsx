'use client'

import type { OrderStatus } from '@rabbit/database'
import { GoogleOrderMap } from '@/components/track/GoogleOrderMap'

// GOOGLE MAPS & AUTH ACTIVATION — client wrapper for order tracking map
export function OrderGoogleMapSection({
  orderId,
  status,
  shopLat,
  shopLng,
  destLat,
  destLng,
}: {
  orderId: string
  status: OrderStatus
  shopLat: number
  shopLng: number
  destLat: number
  destLng: number
}) {
  return (
    <GoogleOrderMap
      orderId={orderId}
      status={status}
      shopLat={shopLat}
      shopLng={shopLng}
      destLat={destLat}
      destLng={destLng}
    />
  )
}
