'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { io, type Socket } from 'socket.io-client'
import { ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import type { OrderStatus } from '@rabbit/database'
import type { MapPoint } from './TrackingMapView'

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000'

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    })
  }
  return socket
}

function MapFallback({
  destLat,
  destLng,
  driverLocation,
}: {
  destLat: number
  destLng: number
  driverLocation: MapPoint | null
}) {
  const lat = driverLocation?.lat ?? destLat
  const lng = driverLocation?.lng ?? destLng
  const delta = 0.02
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`

  return (
    <iframe
      title="Order delivery map"
      src={src}
      className="h-64 w-full rounded-xl border-0"
      loading="lazy"
    />
  )
}

export function TrackingMap({
  orderId,
  initialStatus,
  destLat,
  destLng,
  shopLat,
  shopLng,
}: {
  orderId: string
  initialStatus: OrderStatus
  destLat: number
  destLng: number
  shopLat?: number
  shopLng?: number
}) {
  const [mounted, setMounted] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [MapView, setMapView] = useState<ComponentType<{
    driverLocation: MapPoint | null
    destLat: number
    destLng: number
    shopLat?: number
    shopLng?: number
  }> | null>(null)

  const [driverLocation, setDriverLocation] = useState<MapPoint | null>(null)
  const [status, setStatus] = useState(ORDER_STATUS_LABELS[initialStatus])
  const [socketConnected, setSocketConnected] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    import('./TrackingMapView')
      .then((mod) => {
        setMapView(() => mod.TrackingMapView)
        setMapReady(true)
      })
      .catch(() => setMapError(true))
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    const client = getSocket()

    const onConnect = () => setSocketConnected(true)
    const onDisconnect = () => setSocketConnected(false)
    const onLocation = (data: MapPoint) => setDriverLocation({ lat: data.lat, lng: data.lng })
    const onStatus = (newStatus: string) => setStatus(newStatus)

    client.emit('join-order-room', { orderId })
    client.on('connect', onConnect)
    client.on('disconnect', onDisconnect)
    client.on('location-updated', onLocation)
    client.on('status-updated', onStatus)

    if (client.connected) setSocketConnected(true)

    return () => {
      client.emit('leave-order-room', { orderId })
      client.off('connect', onConnect)
      client.off('disconnect', onDisconnect)
      client.off('location-updated', onLocation)
      client.off('status-updated', onStatus)
    }
  }, [mounted, orderId])

  const showLiveIndicator =
    initialStatus === 'OUT_FOR_DELIVERY' || status === ORDER_STATUS_LABELS.OUT_FOR_DELIVERY

  if (!mounted) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-gray-100 p-4">
        <div className="mb-3 rounded-xl bg-gray-200 p-3 text-xs font-bold text-gray-500">
          Loading tracker…
        </div>
        <div className="flex h-64 items-center justify-center rounded-xl bg-gray-200 text-xs text-gray-500">
          Loading map…
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-gray-100 p-4">
      <div
        className={`mb-3 rounded-xl p-3 text-xs font-bold ${
          showLiveIndicator
            ? 'animate-pulse bg-orange-50 text-orange-700'
            : 'bg-rabbit-50 text-rabbit-800'
        }`}
      >
        🛵 Status: {status}
        {!socketConnected && (
          <span className="ml-2 font-normal text-gray-500">(connecting to live updates…)</span>
        )}
      </div>

      {mapError || !MapView || !mapReady ? (
        <MapFallback destLat={destLat} destLng={destLng} driverLocation={driverLocation} />
      ) : (
        <MapView
          driverLocation={driverLocation}
          destLat={destLat}
          destLng={destLng}
          shopLat={shopLat}
          shopLng={shopLng}
        />
      )}
    </div>
  )
}
