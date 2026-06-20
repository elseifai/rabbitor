'use client'

import { use } from 'react'
import { CustomerOrderTracking } from '@/components/track/CustomerOrderTracking'

/**
 * /checkout/track/[orderId]
 *
 * Post-checkout live tracking dashboard.
 * Renders the full glassmorphic tracking UI: real-time rider GPS marker
 * animating on Google Maps, ETA countdown, order milestone progress,
 * rider contact card, and delivery address summary.
 *
 * Delegates all logic to <CustomerOrderTracking /> which:
 *  - Subscribes to the Socket.io order room for live location-updated /
 *    tracking:stream events (no-poll real-time rider position).
 *  - Fetches a real-road Directions API polyline via GoogleOrderMap.
 *  - Falls back to 15-second REST polling when the socket is unavailable.
 */
interface Props {
  params: Promise<{ orderId: string }>
}

export default function CheckoutTrackPage({ params }: Props) {
  const { orderId } = use(params)
  return <CustomerOrderTracking orderId={orderId} />
}
