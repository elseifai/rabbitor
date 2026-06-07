'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { OrderStatus } from '@rabbit/database'
import type { MapPoint } from './RabbitMapView'

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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t))
}

/** Map order status → progress along shop→home route (0–1). */
function baseProgress(status: OrderStatus): number {
  switch (status) {
    case 'PENDING':
      return 0.04
    case 'ACCEPTED_BY_SHOP':
      return 0.12
    case 'PREPARING':
      return 0.22
    case 'OUT_FOR_DELIVERY':
      return 0.45
    case 'DELIVERED':
      return 1
    case 'CANCELLED':
      return 0
    default:
      return 0.05
  }
}

function MapFallback({
  shopLat,
  shopLng,
  destLat,
  destLng,
  progress,
}: {
  shopLat: number
  shopLng: number
  destLat: number
  destLng: number
  progress: number
}) {
  const lat = lerp(shopLat, destLat, progress)
  const lng = lerp(shopLng, destLng, progress)
  const delta = 0.025
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`

  return (
    <iframe
      title="Rabbitor delivery map"
      src={src}
      className="h-72 w-full rounded-2xl border-0"
      loading="lazy"
    />
  )
}

export function RabbitLiveMap({
  orderId,
  status,
  shopLat,
  shopLng,
  destLat,
  destLng,
}: {
  orderId: string
  status: OrderStatus
  shopLat: number
  shopLng: number
  destLat: number
  destLng: number
}) {
  const [mounted, setMounted] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [driverLocation, setDriverLocation] = useState<MapPoint | null>(null)
  const [animProgress, setAnimProgress] = useState(baseProgress(status))
  const [MapView, setMapView] = useState<ComponentType<{
    shopLat: number
    shopLng: number
    destLat: number
    destLng: number
    rabbitLat: number
    rabbitLng: number
    progress: number
    status: OrderStatus
  }> | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    import('./RabbitMapView')
      .then((mod) => {
        setMapView(() => mod.RabbitMapView)
        setMapReady(true)
      })
      .catch(() => setMapError(true))
  }, [mounted])

  useEffect(() => {
    setAnimProgress(baseProgress(status))
  }, [status])

  // Smooth bunny run animation while out for delivery
  useEffect(() => {
    if (status !== 'OUT_FOR_DELIVERY') return
    const start = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const creep = Math.min(0.45, (elapsed / 90000) * 0.45)
      setAnimProgress(Math.min(0.92, 0.45 + creep))
    }, 800)
    return () => clearInterval(tick)
  }, [status])

  useEffect(() => {
    if (!mounted || !orderId) return
    const client = getSocket()
    const onLocation = (data: MapPoint) => setDriverLocation({ lat: data.lat, lng: data.lng })
    client.emit('join-order-room', { orderId })
    client.on('location-updated', onLocation)
    return () => {
      client.emit('leave-order-room', { orderId })
      client.off('location-updated', onLocation)
    }
  }, [mounted, orderId])

  const progress = useMemo(() => {
    if (status === 'DELIVERED') return 1
    if (driverLocation) {
      const distShopDest = Math.hypot(destLat - shopLat, destLng - shopLng) || 1
      const distShopRider = Math.hypot(driverLocation.lat - shopLat, driverLocation.lng - shopLng)
      return Math.min(0.95, Math.max(0.1, distShopRider / distShopDest))
    }
    return animProgress
  }, [status, driverLocation, shopLat, shopLng, destLat, destLng, animProgress])

  const rabbitLat = driverLocation?.lat ?? lerp(shopLat, destLat, progress)
  const rabbitLng = driverLocation?.lng ?? lerp(shopLng, destLng, progress)

  if (!mounted) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
        Loading live map…
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold text-slate-700">Live Rabbitor Map</p>
        <p className="text-[10px] font-semibold text-[#FF6B35]">
          {status === 'DELIVERED'
            ? '✓ Delivered!'
            : status === 'OUT_FOR_DELIVERY'
              ? '🐰 Bunny is running to you'
              : '🏪 At the store'}
        </p>
      </div>

      {mapError || !MapView || !mapReady ? (
        <MapFallback
          shopLat={shopLat}
          shopLng={shopLng}
          destLat={destLat}
          destLng={destLng}
          progress={progress}
        />
      ) : (
        <MapView
          shopLat={shopLat}
          shopLng={shopLng}
          destLat={destLat}
          destLng={destLng}
          rabbitLat={rabbitLat}
          rabbitLng={rabbitLng}
          progress={progress}
          status={status}
        />
      )}
    </div>
  )
}
