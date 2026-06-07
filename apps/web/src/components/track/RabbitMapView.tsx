'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { OrderStatus } from '@rabbit/database'

export interface MapPoint {
  lat: number
  lng: number
}

function MapBounds({ points }: { points: MapPoint[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
      return
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 })
  }, [map, points])

  return null
}

function makeIcons() {
  return {
    rabbit: L.divIcon({
      className: 'rabbit-map-marker-wrap',
      html: `<div class="rabbit-map-marker"><span>🐰</span></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    }),
    shop: L.divIcon({
      className: 'leaflet-div-icon-custom',
      html: '<div style="background:#2563eb;width:26px;height:26px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:13px">🏪</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    }),
    home: L.divIcon({
      className: 'leaflet-div-icon-custom',
      html: '<div style="background:#0C831F;width:26px;height:26px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:13px">🏠</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    }),
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t))
}

export function RabbitMapView({
  shopLat,
  shopLng,
  destLat,
  destLng,
  rabbitLat,
  rabbitLng,
  progress,
  status,
}: {
  shopLat: number
  shopLng: number
  destLat: number
  destLng: number
  rabbitLat: number
  rabbitLng: number
  progress: number
  status: OrderStatus
}) {
  const [icons, setIcons] = useState<ReturnType<typeof makeIcons> | null>(null)

  useEffect(() => {
    setIcons(makeIcons())
  }, [])

  const shop = useMemo(() => ({ lat: shopLat, lng: shopLng }), [shopLat, shopLng])
  const dest = useMemo(() => ({ lat: destLat, lng: destLng }), [destLat, destLng])
  const rabbit = useMemo(() => ({ lat: rabbitLat, lng: rabbitLng }), [rabbitLat, rabbitLng])

  const fullRoute: [number, number][] = useMemo(
    () => [
      [shop.lat, shop.lng],
      [dest.lat, dest.lng],
    ],
    [shop, dest],
  )

  const traveledRoute: [number, number][] = useMemo(() => {
    const midLat = lerp(shop.lat, dest.lat, progress)
    const midLng = lerp(shop.lng, dest.lng, progress)
    return [
      [shop.lat, shop.lng],
      [midLat, midLng],
    ]
  }, [shop, dest, progress])

  const fitPoints = useMemo(() => [shop, rabbit, dest], [shop, rabbit, dest])

  if (!icons) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-500">
        Loading map…
      </div>
    )
  }

  const isDelivered = status === 'DELIVERED'

  return (
    <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-100 shadow-inner [&_.leaflet-container]:z-0">
      <MapContainer
        center={[rabbit.lat, rabbit.lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds points={fitPoints} />

        <Polyline
          positions={fullRoute}
          pathOptions={{ color: '#CBD5E1', weight: 5, dashArray: '8 8', opacity: 0.9 }}
        />
        <Polyline
          positions={traveledRoute}
          pathOptions={{ color: '#FF6B35', weight: 5, opacity: 0.95 }}
        />

        <Marker position={[shop.lat, shop.lng]} icon={icons.shop}>
          <Popup>🏪 {isDelivered ? 'Picked up from here' : 'Store — pickup'}</Popup>
        </Marker>

        <Marker position={[dest.lat, dest.lng]} icon={icons.home}>
          <Popup>🏠 Your delivery address</Popup>
        </Marker>

        {!isDelivered && (
          <Marker position={[rabbit.lat, rabbit.lng]} icon={icons.rabbit}>
            <Popup>🐰 Rabbitor is on the way!</Popup>
          </Marker>
        )}

        {isDelivered && (
          <CircleMarker
            center={[dest.lat, dest.lng]}
            radius={12}
            pathOptions={{ color: '#0C831F', fillColor: '#0C831F', fillOpacity: 0.15, weight: 2 }}
          />
        )}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-2 text-[10px] font-bold shadow-md backdrop-blur-sm">
        <span className="text-[#FF6B35]">🐰 Rabbitor</span>
        <span className="mx-1 text-slate-300">→</span>
        <span className="text-[#0C831F]">{Math.round(progress * 100)}% en route</span>
      </div>
    </div>
  )
}
