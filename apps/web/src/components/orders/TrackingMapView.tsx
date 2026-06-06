'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [map, points])

  return null
}

function makeIcons() {
  return {
    driver: L.divIcon({
      className: 'leaflet-div-icon-custom',
      html: '<div style="background:#ea580c;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px">🛵</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
    dest: L.divIcon({
      className: 'leaflet-div-icon-custom',
      html: '<div style="background:#16a34a;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    shop: L.divIcon({
      className: 'leaflet-div-icon-custom',
      html: '<div style="background:#2563eb;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
  }
}

export function TrackingMapView({
  driverLocation,
  destLat,
  destLng,
  shopLat,
  shopLng,
}: {
  driverLocation: MapPoint | null
  destLat: number
  destLng: number
  shopLat?: number
  shopLng?: number
}) {
  const [icons, setIcons] = useState<ReturnType<typeof makeIcons> | null>(null)

  useEffect(() => {
    setIcons(makeIcons())
  }, [])

  const dest = useMemo(() => ({ lat: destLat, lng: destLng }), [destLat, destLng])
  const shop = useMemo(
    () => (shopLat != null && shopLng != null ? { lat: shopLat, lng: shopLng } : null),
    [shopLat, shopLng],
  )

  const center = driverLocation ?? dest

  const fitPoints = useMemo(() => {
    const pts: MapPoint[] = []
    if (shop) pts.push(shop)
    if (driverLocation) pts.push(driverLocation)
    pts.push(dest)
    return pts
  }, [shop, driverLocation, dest])

  const polyline = useMemo(() => {
    const pts: [number, number][] = []
    if (shop) pts.push([shop.lat, shop.lng])
    if (driverLocation) pts.push([driverLocation.lat, driverLocation.lng])
    pts.push([dest.lat, dest.lng])
    return pts.length >= 2 ? pts : []
  }, [shop, driverLocation, dest])

  if (!icons) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-gray-200 text-xs text-gray-500">
        Initializing map…
      </div>
    )
  }

  return (
    <div className="h-64 overflow-hidden rounded-xl [&_.leaflet-container]:z-0">
      <MapContainer
        key={`${destLat}-${destLng}`}
        center={[center.lat, center.lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds points={fitPoints} />

        {shop && (
          <Marker position={[shop.lat, shop.lng]} icon={icons.shop}>
            <Popup>Pickup — Shop</Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={icons.driver}>
            <Popup>Your delivery partner</Popup>
          </Marker>
        )}

        <Marker position={[dest.lat, dest.lng]} icon={icons.dest}>
          <Popup>Delivery address</Popup>
        </Marker>

        {polyline.length >= 2 && (
          <Polyline positions={polyline} pathOptions={{ color: '#ea580c', weight: 4, opacity: 0.7 }} />
        )}
      </MapContainer>
    </div>
  )
}
