'use client'

import { useEffect, useRef, useState } from 'react'
import type { OrderStatus } from '@rabbit/database'
import { labelToOrderStatus } from '@/lib/tracking-status'
import { bearingDegrees } from '@/lib/tracking-eta'
import { socketClient } from '@/lib/socket-client'
import { useSocket } from '@/context/SocketContext'

export interface RiderLocation {
  lat: number
  lng: number
  bearing?: number
}

function parseStatusPayload(payload: unknown): OrderStatus | null {
  if (typeof payload === 'string') {
    return labelToOrderStatus(payload)
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as { status?: string }
    if (!obj.status) return null
    const asLabel = labelToOrderStatus(obj.status)
    if (asLabel) return asLabel
    const direct = obj.status as OrderStatus
    if (
      [
        'PENDING',
        'ACCEPTED_BY_SHOP',
        'PREPARING',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ].includes(direct)
    ) {
      return direct
    }
  }
  return null
}

export function useOrderTrackingSocket(orderId: string) {
  const { connected, reconnecting, latencyMs } = useSocket()
  const [status, setStatus] = useState<OrderStatus | null>(null)
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null)
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!orderId) return

    const releaseRoom = socketClient.acquireOrderRoom(orderId)

    const onStatusLabel = (label: string) => {
      const next = labelToOrderStatus(label)
      if (next) setStatus(next)
    }

    const onStatusUpdated = (payload: unknown) => {
      const next = parseStatusPayload(payload)
      if (next) setStatus(next)
    }

    const onLocation = (data: { lat: number; lng: number; bearing?: number }) => {
      if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return

      const prev = prevLocationRef.current
      const bearing =
        data.bearing ??
        (prev
          ? bearingDegrees(prev.lat, prev.lng, data.lat, data.lng)
          : undefined)

      prevLocationRef.current = { lat: data.lat, lng: data.lng }
      setRiderLocation({ lat: data.lat, lng: data.lng, bearing })
    }

    const unsubs = [
      socketClient.on('status-updated', onStatusLabel),
      socketClient.on('ORDER_STATUS_UPDATED', onStatusUpdated),
      socketClient.on('location-updated', onLocation),
    ]

    return () => {
      unsubs.forEach((off) => off())
      releaseRoom()
      setRiderLocation(null)
    }
  }, [orderId])

  return { connected, reconnecting, latencyMs, status, riderLocation }
}
