'use client'

import { useEffect, useRef, useState } from 'react'
import { socketClient } from '@/lib/socket-client'
import { useSocket } from '@/context/SocketContext'

export interface MerchantNewOrderEvent {
  id: string
  orderNumber: string
  storeId: string
  storeName: string
  status: string
  totalPrice: number
  deliveryFee: number
  itemCount: number
  items: Array<{ id: string; name: string; quantity: number; price: number }>
  customerPhone: string
  createdAt: string
  requiresAck: true
  ackDeadlineSeconds: number
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

function mapNetworkState(
  hasCredentials: boolean,
  connected: boolean,
  reconnecting: boolean,
  joinError: string | null,
): ConnectionState {
  if (!hasCredentials) return 'idle'
  if (joinError) return 'error'
  if (reconnecting) return 'connecting'
  if (connected) return 'connected'
  return 'disconnected'
}

export function useMerchantOrderSocket(
  token: string | null,
  storeId: string | null,
  onNewOrder: (order: MerchantNewOrderEvent) => void,
) {
  const { connected, reconnecting } = useSocket()
  const onNewOrderRef = useRef(onNewOrder)
  const [joinError, setJoinError] = useState<string | null>(null)

  onNewOrderRef.current = onNewOrder

  const hasCredentials = Boolean(token && storeId)
  const connectionState = mapNetworkState(
    hasCredentials,
    connected,
    reconnecting,
    joinError,
  )

  useEffect(() => {
    if (!token || !storeId) {
      setJoinError(null)
      return
    }

    setJoinError(null)
    const releaseRoom = socketClient.acquireStoreRoom(storeId, { token })

    const handleStoreJoined = () => setJoinError(null)
    const handleStoreJoinError = (payload: { message?: string }) => {
      setJoinError(payload.message ?? 'Could not join store room')
    }
    const handleNewOrder = (payload: MerchantNewOrderEvent) => {
      onNewOrderRef.current(payload)
    }

    const unsubs = [
      socketClient.on('store-joined', handleStoreJoined),
      socketClient.on('store-join-error', handleStoreJoinError),
      socketClient.on('NEW_ORDER', handleNewOrder),
    ]

    return () => {
      unsubs.forEach((off) => off())
      releaseRoom()
      setJoinError(null)
    }
  }, [token, storeId])

  return { connectionState, joinError }
}
