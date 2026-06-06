'use client'

import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000'

let sharedSocket: Socket | null = null

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(socketUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
    })
  }
  return sharedSocket
}

export function useOrderSocket(orderId: string) {
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return

    const client = getSocket()

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onStatus = (label: string) => setStatus(label)

    client.emit('join-order-room', { orderId })
    client.on('connect', onConnect)
    client.on('disconnect', onDisconnect)
    client.on('status-updated', onStatus)

    if (client.connected) setConnected(true)

    return () => {
      client.emit('leave-order-room', { orderId })
      client.off('connect', onConnect)
      client.off('disconnect', onDisconnect)
      client.off('status-updated', onStatus)
    }
  }, [orderId])

  return { connected, status }
}
