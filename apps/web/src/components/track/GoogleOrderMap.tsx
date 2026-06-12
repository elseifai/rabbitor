'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api'
import type { OrderStatus } from '@rabbit/database'
import { getAuthHeader } from '@/lib/session'
import { Loader2 } from 'lucide-react'

const MAP_CONTAINER_STYLE = { width: '100%', height: '288px', borderRadius: '1rem' }

// LIVE ECOSYSTEM UPGRADE — Google Maps tracking with store, customer, and rider pins
export function GoogleOrderMap({
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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const [riderLat, setRiderLat] = useState<number | null>(null)
  const [riderLng, setRiderLng] = useState<number | null>(null)
  const [mapError, setMapError] = useState(false)

  const pollRider = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { headers: { ...getAuthHeader() } })
      const json = await res.json()
      if (json.success && json.data) {
        const d = json.data as { riderLat?: number | null; riderLng?: number | null }
        if (d.riderLat != null && d.riderLng != null) {
          setRiderLat(d.riderLat)
          setRiderLng(d.riderLng)
        }
      }
    } catch {
      /* polling fallback */
    }
  }, [orderId])

  useEffect(() => {
    void pollRider()
    const id = window.setInterval(() => void pollRider(), 10_000)
    return () => window.clearInterval(id)
  }, [pollRider])

  const center = useMemo(
    () => ({
      lat: (shopLat + destLat + (riderLat ?? shopLat)) / (riderLat != null ? 3 : 2),
      lng: (shopLng + destLng + (riderLng ?? shopLng)) / (riderLng != null ? 3 : 2),
    }),
    [shopLat, shopLng, destLat, destLng, riderLat, riderLng],
  )

  const trail = useMemo(() => {
    const points = [{ lat: shopLat, lng: shopLng }]
    if (riderLat != null && riderLng != null) points.push({ lat: riderLat, lng: riderLng })
    points.push({ lat: destLat, lng: destLng })
    return points
  }, [shopLat, shopLng, destLat, destLng, riderLat, riderLng])

  if (!apiKey || mapError) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-2xl bg-slate-100 px-4 text-center text-sm text-slate-500">
        <p>Map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=${shopLat},${shopLng}&destination=${destLat},${destLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-xs font-bold text-[#FF6B35] hover:underline"
        >
          Open in Google Maps →
        </a>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
      <LoadScript googleMapsApiKey={apiKey} onError={() => setMapError(true)}>
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={14}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'greedy',
          }}
        >
          <Marker
            position={{ lat: shopLat, lng: shopLng }}
            label={{ text: '🏪', fontSize: '14px' }}
            title="Store"
          />
          <Marker
            position={{ lat: destLat, lng: destLng }}
            label={{ text: '🏠', fontSize: '14px' }}
            title="Delivery location"
          />
          {riderLat != null && riderLng != null && status === 'OUT_FOR_DELIVERY' && (
            <Marker
              position={{ lat: riderLat, lng: riderLng }}
              label={{ text: '🛵', fontSize: '14px' }}
              title="Rabbitor"
            />
          )}
          {trail.length >= 2 && (
            <Polyline
              path={trail}
              options={{
                strokeColor: '#FF6B35',
                strokeOpacity: 0.85,
                strokeWeight: 4,
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>
      {status === 'OUT_FOR_DELIVERY' && riderLat == null && (
        <p className="flex items-center justify-center gap-2 bg-white py-2 text-[10px] font-semibold text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Locating rider…
        </p>
      )}
    </div>
  )
}
