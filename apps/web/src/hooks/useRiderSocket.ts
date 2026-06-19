'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { socketClient } from '@/lib/socket-client'
import { useSocket } from '@/context/SocketContext'

export interface DeliveryOfferEvent {
  orderId: string
  orderNumber: string
  storeName: string
  storeLat: number
  storeLng: number
  destLat: number | null
  destLng: number | null
  payoutInr: number
  expiresInSeconds: number
  requiresAccept: true
}

export type DeliveryAssignedEvent = Omit<DeliveryOfferEvent, 'expiresInSeconds' | 'requiresAccept'>

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

function mapNetworkState(
  active: boolean,
  connected: boolean,
  reconnecting: boolean,
  joinError: string | null,
): ConnectionState {
  if (!active) return 'idle'
  if (joinError) return 'error'
  if (reconnecting) return 'connecting'
  if (connected) return 'connected'
  return 'disconnected'
}

export function useRiderSocket(
  token: string | null,
  isOnline: boolean,
  onOffer: (offer: DeliveryOfferEvent) => void,
  onAssigned?: (assignment: DeliveryAssignedEvent) => void,
  onFeedback?: (payload: {
    orderId: string
    shopRating: number
    riderRating: number
    comment: string | null
  }) => void,
) {
  const { connected, reconnecting } = useSocket()
  const onOfferRef = useRef(onOffer)
  const onAssignedRef = useRef(onAssigned)
  const onFeedbackRef = useRef(onFeedback)
  const [joinError, setJoinError] = useState<string | null>(null)

  onOfferRef.current = onOffer
  onAssignedRef.current = onAssigned
  onFeedbackRef.current = onFeedback

  const active = Boolean(token && isOnline)
  const connectionState = mapNetworkState(active, connected, reconnecting, joinError)

  useEffect(() => {
    if (!token || !isOnline) {
      setJoinError(null)
      return
    }

    setJoinError(null)
    const releaseRoom = socketClient.acquireRiderRoom({ token })

    const onRiderJoined = () => setJoinError(null)
    const onRiderJoinError = (payload: { message?: string }) => {
      setJoinError(payload.message ?? 'Could not join rider channel')
    }
    const onOffer = (payload: DeliveryOfferEvent) => onOfferRef.current(payload)
    const onAssigned = (payload: DeliveryAssignedEvent) => onAssignedRef.current?.(payload)
    const onFeedback = (payload: {
      orderId?: string
      shopRating?: number
      riderRating?: number
      comment?: string | null
    }) => {
      if (payload.orderId) {
        onFeedbackRef.current?.({
          orderId: payload.orderId,
          shopRating: payload.shopRating ?? 0,
          riderRating: payload.riderRating ?? 0,
          comment: payload.comment ?? null,
        })
      }
    }

    const unsubs = [
      socketClient.on('rider-joined', onRiderJoined),
      socketClient.on('rider-join-error', onRiderJoinError),
      socketClient.on('DELIVERY_OFFERED', onOffer),
      socketClient.on('DELIVERY_ASSIGNED', onAssigned),
      socketClient.on('FEEDBACK_RECEIVED', onFeedback),
    ]

    return () => {
      unsubs.forEach((off) => off())
      releaseRoom()
      setJoinError(null)
    }
  }, [token, isOnline])

  const emitLocation = useCallback((orderId: string, lat: number, lng: number) => {
    socketClient.emit('RIDER_LOCATION_UPDATE', { orderId, lat, lng })
  }, [])

  return { connectionState, joinError, emitLocation }
}
