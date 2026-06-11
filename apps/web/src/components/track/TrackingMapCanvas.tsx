'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { OrderStatus } from '@rabbit/database'
import type { RiderLocation } from '@/hooks/useOrderTrackingSocket'

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

type LeafletModules = {
  MapContainer: typeof import('react-leaflet').MapContainer
  TileLayer: typeof import('react-leaflet').TileLayer
  Marker: typeof import('react-leaflet').Marker
  Popup: typeof import('react-leaflet').Popup
  Polyline: typeof import('react-leaflet').Polyline
  useMap: typeof import('react-leaflet').useMap
  L: typeof import('leaflet')
}

function MapLayers({
  modules,
  target,
  shop,
  dest,
  status,
}: {
  modules: LeafletModules
  target: RiderLocation | null
  shop: { lat: number; lng: number }
  dest: { lat: number; lng: number }
  status: OrderStatus
}) {
  const { TileLayer, Marker, Popup, Polyline, useMap, L } = modules
  const map = useMap()
  const [display, setDisplay] = useState(
    target ?? { lat: shop.lat, lng: shop.lng, bearing: 0 },
  )
  const animRef = useRef<number | null>(null)
  const fromRef = useRef(display)

  useEffect(() => {
    if (!target) return

    const from = fromRef.current
    const start = performance.now()
    const duration = 900

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setDisplay({
        lat: lerp(from.lat, target.lat, eased),
        lng: lerp(from.lng, target.lng, eased),
        bearing: target.bearing ?? from.bearing,
      })
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(tick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [target])

  useEffect(() => {
    const bounds = L.latLngBounds([
      [shop.lat, shop.lng],
      [display.lat, display.lng],
      [dest.lat, dest.lng],
    ])
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 16, animate: true })
  }, [map, L, shop, dest, display.lat, display.lng])

  const shopIcon = L.divIcon({
    className: 'leaflet-div-icon-custom',
    html: '<div class="tracking-shop-marker">🏪</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })

  const homeIcon = L.divIcon({
    className: 'leaflet-div-icon-custom',
    html: '<div class="tracking-home-marker">🏠</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })

  const riderIcon = L.divIcon({
    className: 'leaflet-div-icon-custom',
    html: `<div class="tracking-rider-marker" style="transform:rotate(${display.bearing ?? 0}deg)">🛵</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })

  return (
    <>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline
        positions={[
          [shop.lat, shop.lng],
          [dest.lat, dest.lng],
        ]}
        pathOptions={{ color: '#E2E8F0', weight: 5, dashArray: '10 8' }}
      />
      <Polyline
        positions={[
          [shop.lat, shop.lng],
          [display.lat, display.lng],
        ]}
        pathOptions={{ color: '#FF6B35', weight: 5 }}
      />
      <Marker position={[shop.lat, shop.lng]} icon={shopIcon}>
        <Popup>Store pickup</Popup>
      </Marker>
      <Marker position={[dest.lat, dest.lng]} icon={homeIcon}>
        <Popup>Your location</Popup>
      </Marker>
      {status !== 'DELIVERED' && (
        <Marker position={[display.lat, display.lng]} icon={riderIcon}>
          <Popup>Rider on the way</Popup>
        </Marker>
      )}
    </>
  )
}

export function TrackingMapCanvas({
  shopLat,
  shopLng,
  destLat,
  destLng,
  riderLocation,
  status,
}: {
  shopLat: number
  shopLng: number
  destLat: number
  destLng: number
  riderLocation: RiderLocation | null
  status: OrderStatus
}) {
  const [mounted, setMounted] = useState(false)
  const [modules, setModules] = useState<LeafletModules | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    void Promise.all([import('react-leaflet'), import('leaflet')]).then(
      ([rl, leaf]) => {
        setModules({
          MapContainer: rl.MapContainer,
          TileLayer: rl.TileLayer,
          Marker: rl.Marker,
          Popup: rl.Popup,
          Polyline: rl.Polyline,
          useMap: rl.useMap,
          L: leaf.default,
        })
      },
    )
  }, [mounted])

  const center = useMemo(
    () => ({
      lat: riderLocation?.lat ?? lerp(shopLat, destLat, 0.5),
      lng: riderLocation?.lng ?? lerp(shopLng, destLng, 0.5),
    }),
    [riderLocation, shopLat, shopLng, destLat, destLng],
  )

  if (!mounted || !modules) {
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
  }

  const { MapContainer } = modules

  return (
    <div className="relative h-80 overflow-hidden rounded-2xl border border-slate-100 shadow-inner [&_.leaflet-container]:z-0">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <MapLayers
          modules={modules}
          target={riderLocation}
          shop={{ lat: shopLat, lng: shopLng }}
          dest={{ lat: destLat, lng: destLng }}
          status={status}
        />
      </MapContainer>
    </div>
  )
}
