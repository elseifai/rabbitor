'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api'
import type { OrderStatus } from '@rabbit/database'
import { getAuthHeader } from '@/lib/session'
import { useOrderTrackingSocket } from '@/hooks/useOrderTrackingSocket'
import { Loader2 } from 'lucide-react'

const MAP_CONTAINER_STYLE = { width: '100%', height: '288px', borderRadius: '1rem' }

// GOOGLE MAPS & AUTH ACTIVATION — store, customer, rider markers + delivery polyline
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
  const { riderLocation } = useOrderTrackingSocket(orderId)

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

  useEffect(() => {
    if (riderLocation) {
      setRiderLat(riderLocation.lat)
      setRiderLng(riderLocation.lng)
    }
  }, [riderLocation])

  const activeRiderLat = riderLat
  const activeRiderLng = riderLng
  const showRider =
    activeRiderLat != null &&
    activeRiderLng != null &&
    ['OUT_FOR_DELIVERY', 'PREPARING', 'ACCEPTED_BY_SHOP'].includes(status)

  const center = useMemo(
    () => ({
      lat: (shopLat + destLat + (activeRiderLat ?? shopLat)) / (activeRiderLat != null ? 3 : 2),
      lng: (shopLng + destLng + (activeRiderLng ?? shopLng)) / (activeRiderLng != null ? 3 : 2),
    }),
    [shopLat, shopLng, destLat, destLng, activeRiderLat, activeRiderLng],
  )

  const routeLine = useMemo(
    () => [
      { lat: shopLat, lng: shopLng },
      { lat: destLat, lng: destLng },
    ],
    [shopLat, shopLng, destLat, destLng],
  )

  if (!apiKey || mapError) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/30 px-4 text-center text-sm text-gray-500">
        <p>Map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=${shopLat},${shopLng}&destination=${destLat},${destLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-xs font-bold text-orange-500 hover:underline"
        >
          Open in Google Maps →
        </a>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 shadow-sm">
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
          {showRider && (
            <Marker
              position={{ lat: activeRiderLat!, lng: activeRiderLng! }}
              label={{ text: '🐰', fontSize: '14px' }}
              title="Rabbitor"
            />
          )}
          <Polyline
            path={routeLine}
            options={{
              strokeColor: '#FF6B35',
              strokeOpacity: 0.9,
              strokeWeight: 4,
            }}
          />
        </GoogleMap>
      </LoadScript>
      {status === 'OUT_FOR_DELIVERY' && !showRider && (
        <p className="flex items-center justify-center gap-2 bg-white py-2 text-[10px] font-semibold text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
          Locating rider…
        </p>
      )}
    </div>
  )
}
