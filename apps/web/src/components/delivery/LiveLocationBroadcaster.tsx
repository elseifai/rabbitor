'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { MapPin, Radio } from 'lucide-react'

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000'

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    socket = io(socketUrl, { autoConnect: true })
  }
  return socket
}

export function LiveLocationBroadcaster({
  orderId,
  destLat,
  destLng,
}: {
  orderId: string
  destLat: number
  destLng: number
}) {
  const watchIdRef = useRef<number | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [lastSent, setLastSent] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId || !navigator.geolocation) {
      setError('Geolocation is not available on this device')
      return
    }

    const client = getSocket()
    client.emit('join-order-room', { orderId })

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setLastSent({ lat, lng })
        setIsTracking(true)
        setError(null)
        client.emit('update-live-location', { orderId, lat, lng })
      },
      (err) => {
        setIsTracking(false)
        setError(err.message || 'Unable to access GPS')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      client.emit('leave-order-room', { orderId })
    }
  }, [orderId])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`h-5 w-5 ${isTracking ? 'animate-pulse text-rabbit-400' : 'text-gray-500'}`} />
            <div>
              <p className="font-semibold">Live GPS tracking</p>
              <p className="text-xs text-gray-500">
                {isTracking ? 'Broadcasting your location to customer' : 'Waiting for GPS signal…'}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              isTracking ? 'bg-rabbit-600/20 text-rabbit-400' : 'bg-gray-800 text-gray-500'
            }`}
          >
            {isTracking ? 'Live' : 'Offline'}
          </span>
        </div>

        {lastSent && (
          <p className="mt-3 font-mono text-xs text-gray-400">
            {lastSent.lat.toFixed(5)}, {lastSent.lng.toFixed(5)}
          </p>
        )}

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rabbit-400" />
          <div>
            <p className="font-medium">Drop-off coordinates</p>
            <p className="mt-1 font-mono text-xs text-gray-400">
              {destLat.toFixed(5)}, {destLng.toFixed(5)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
