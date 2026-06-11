'use client'

import { useEffect, useState } from 'react'
import { socketClient } from '@/lib/socket-client'
import { useSocket } from '@/context/SocketContext'

export function useOrderSocket(orderId: string) {
  const { connected, reconnecting, latencyMs } = useSocket()
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return

    const releaseRoom = socketClient.acquireOrderRoom(orderId)
    const offStatus = socketClient.on('status-updated', (label: string) => setStatus(label))

    return () => {
      offStatus()
      releaseRoom()
    }
  }, [orderId])

  return { connected, reconnecting, latencyMs, status }
}
