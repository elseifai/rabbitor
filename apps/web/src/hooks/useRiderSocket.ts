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
) {
  const { connected, reconnecting } = useSocket()
  const onOfferRef = useRef(onOffer)
  const [joinError, setJoinError] = useState<string | null>(null)

  onOfferRef.current = onOffer

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

    const unsubs = [
      socketClient.on('rider-joined', onRiderJoined),
      socketClient.on('rider-join-error', onRiderJoinError),
      socketClient.on('DELIVERY_OFFERED', onOffer),
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
