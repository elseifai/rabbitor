'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Radio } from 'lucide-react'
import { socketClient } from '@/lib/socket-client'
import { useAuth } from '@/context/AuthContext'
import { useRiderLocationStream } from '@/hooks/useRiderLocationStream'

// GOOGLE MAPS & AUTH ACTIVATION — socket broadcast + DB coordinate streaming
export function LiveLocationBroadcaster({
  orderId,
  destLat,
  destLng,
}: {
  orderId: string
  destLat: number
  destLng: number
}) {
  const { token } = useAuth()
  const watchIdRef = useRef<number | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [lastSent, setLastSent] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useRiderLocationStream({
    orderId,
    enabled: true,
    onError: (msg) => setError(msg),
  })

  useEffect(() => {
    if (!orderId || !navigator.geolocation) {
      setError('Geolocation is not available on this device')
      return
    }

    const releaseRoom = socketClient.acquireOrderRoom(orderId, { token })

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setLastSent({ lat, lng })
        setIsTracking(true)
        setError(null)
        socketClient.emit('update-live-location', { orderId, lat, lng })
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
      releaseRoom()
    }
  }, [orderId, token])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`h-5 w-5 ${isTracking ? 'animate-pulse text-orange-500' : 'text-gray-400'}`} />
            <div>
              <p className="font-semibold text-gray-900">Live GPS tracking</p>
              <p className="text-xs text-gray-500">
                {isTracking
                  ? 'Broadcasting to customers & syncing every 10s'
                  : 'Waiting for GPS signal…'}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              isTracking ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isTracking ? 'Live' : 'Offline'}
          </span>
        </div>

        {lastSent && (
          <p className="mt-3 font-mono text-xs text-gray-500">
            {lastSent.lat.toFixed(5)}, {lastSent.lng.toFixed(5)}
          </p>
        )}

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </div>

      <div className="rounded-2xl border border-orange-100 bg-white p-4">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <div>
            <p className="font-medium text-gray-900">Drop-off coordinates</p>
            <p className="mt-1 font-mono text-xs text-gray-500">
              {destLat.toFixed(5)}, {destLng.toFixed(5)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
