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
  storeIds: string[] | string | null,
  onNewOrder: (order: MerchantNewOrderEvent) => void,
  onRiderStage?: (payload: { orderId: string; stage: string }) => void,
  onOrderStatus?: (payload: { orderId: string; status: string }) => void,
  onFeedback?: (payload: {
    orderId: string
    shopRating: number
    riderRating: number
    comment: string | null
  }) => void,
) {
  const { connected, reconnecting } = useSocket()
  const onNewOrderRef = useRef(onNewOrder)
  const onRiderStageRef = useRef(onRiderStage)
  const onOrderStatusRef = useRef(onOrderStatus)
  const onFeedbackRef = useRef(onFeedback)
  const [joinError, setJoinError] = useState<string | null>(null)

  onNewOrderRef.current = onNewOrder
  onRiderStageRef.current = onRiderStage
  onOrderStatusRef.current = onOrderStatus
  onFeedbackRef.current = onFeedback

  const normalizedStoreIds = Array.isArray(storeIds)
    ? storeIds
    : storeIds
      ? [storeIds]
      : []
  const storeKey = normalizedStoreIds.join(',')

  const hasCredentials = Boolean(token && normalizedStoreIds.length > 0)
  const connectionState = mapNetworkState(
    hasCredentials,
    connected,
    reconnecting,
    joinError,
  )

  useEffect(() => {
    if (!token || normalizedStoreIds.length === 0) {
      setJoinError(null)
      return
    }

    setJoinError(null)
    const releaseRooms = normalizedStoreIds.map((storeId) =>
      socketClient.acquireStoreRoom(storeId, { token }),
    )

    const handleStoreJoined = () => setJoinError(null)
    const handleStoreJoinError = (payload: { message?: string }) => {
      setJoinError(payload.message ?? 'Could not join store room')
    }
    const handleNewOrder = (payload: MerchantNewOrderEvent) => {
      onNewOrderRef.current(payload)
    }
    const handleRiderStage = (payload: { orderId?: string; stage?: string }) => {
      if (payload.orderId && payload.stage) {
        onRiderStageRef.current?.({ orderId: payload.orderId, stage: payload.stage })
      }
    }
    const handleOrderStatus = (payload: { orderId?: string; status?: string }) => {
      if (payload.orderId && payload.status) {
        onOrderStatusRef.current?.({ orderId: payload.orderId, status: payload.status })
      }
    }
    const handleFeedback = (payload: {
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
      socketClient.on('store-joined', handleStoreJoined),
      socketClient.on('store-join-error', handleStoreJoinError),
      socketClient.on('NEW_ORDER', handleNewOrder),
      socketClient.on('RIDER_STAGE_UPDATED', handleRiderStage),
      socketClient.on('ORDER_STATUS_UPDATED', handleOrderStatus),
      socketClient.on('FEEDBACK_RECEIVED', handleFeedback),
    ]

    return () => {
      unsubs.forEach((off) => off())
      releaseRooms.forEach((release) => release())
      setJoinError(null)
    }
  }, [token, storeKey])

  return { connectionState, joinError }
}
