'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api'
import type { OrderStatus } from '@rabbit/database'
import { getAuthHeader } from '@/lib/session'
import { useOrderTrackingSocket } from '@/hooks/useOrderTrackingSocket'
import { distanceKm } from '@/lib/geo'
import { fetchDrivingRoute, type LatLng } from '@/lib/directions'
import { Loader2 } from 'lucide-react'

const MAP_CONTAINER_STYLE = { width: '100%', height: '340px', borderRadius: '1rem' }

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

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
  const [displayLat, setDisplayLat] = useState<number | null>(null)
  const [displayLng, setDisplayLng] = useState<number | null>(null)
  const [bearing, setBearing] = useState(0)
  const [mapError, setMapError] = useState(false)
  const [routePath, setRoutePath] = useState<LatLng[] | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const animRef = useRef<number | null>(null)
  const targetRef = useRef<{ lat: number; lng: number; bearing?: number } | null>(null)
  const routeFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
          targetRef.current = { lat: d.riderLat, lng: d.riderLng }
        }
      }
    } catch {
      /* polling fallback */
    }
  }, [orderId])

  useEffect(() => {
    void pollRider()
    const id = window.setInterval(() => void pollRider(), 8_000)
    return () => window.clearInterval(id)
  }, [pollRider])

  useEffect(() => {
    if (riderLocation) {
      setRiderLat(riderLocation.lat)
      setRiderLng(riderLocation.lng)
      targetRef.current = {
        lat: riderLocation.lat,
        lng: riderLocation.lng,
        bearing: riderLocation.bearing,
      }
      if (riderLocation.bearing != null) setBearing(riderLocation.bearing)
    }
  }, [riderLocation])

  // Fetch real-road Directions API polyline; re-fetch when rider moves significantly
  useEffect(() => {
    if (routeFetchRef.current) clearTimeout(routeFetchRef.current)
    routeFetchRef.current = setTimeout(() => {
      const rider =
        displayLat != null && displayLng != null
          ? { lat: displayLat, lng: displayLng }
          : null
      void fetchDrivingRoute(
        { lat: shopLat, lng: shopLng },
        { lat: destLat, lng: destLng },
        rider,
      ).then((result) => {
        if (result.path.length > 1) setRoutePath(result.path)
      })
    }, 2000) // debounce: refetch at most once per 2 s after rider moves
    return () => {
      if (routeFetchRef.current) clearTimeout(routeFetchRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayLat, displayLng, shopLat, shopLng, destLat, destLng])

  useEffect(() => {
    if (riderLat == null || riderLng == null) return

    if (displayLat == null || displayLng == null) {
      setDisplayLat(riderLat)
      setDisplayLng(riderLng)
      return
    }

    const from = { lat: displayLat, lng: displayLng }
    const to = targetRef.current ?? { lat: riderLat, lng: riderLng }
    const start = performance.now()
    const duration = 1200

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = t * (2 - t)
      setDisplayLat(lerp(from.lat, to.lat, eased))
      setDisplayLng(lerp(from.lng, to.lng, eased))
      if (to.bearing != null) setBearing(to.bearing)
      if (t < 1) animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [riderLat, riderLng, displayLat, displayLng])

  const showRider =
    displayLat != null &&
    displayLng != null &&
    status !== 'DELIVERED' &&
    status !== 'CANCELLED' &&
    status !== 'PENDING'

  // Use Directions API road geometry when available; straight-line as fallback
  const routeLine = useMemo(() => {
    if (routePath && routePath.length > 1) return routePath
    const points = [{ lat: shopLat, lng: shopLng }]
    if (showRider) points.push({ lat: displayLat!, lng: displayLng! })
    points.push({ lat: destLat, lng: destLng })
    return points
  }, [routePath, shopLat, shopLng, destLat, destLng, showRider, displayLat, displayLng])

  const center = useMemo(
    () => ({
      lat: (shopLat + destLat + (displayLat ?? shopLat)) / (displayLat != null ? 3 : 2),
      lng: (shopLng + destLng + (displayLng ?? shopLng)) / (displayLng != null ? 3 : 2),
    }),
    [shopLat, shopLng, destLat, destLng, displayLat, displayLng],
  )

  const fitMapBounds = useCallback(
    (map: google.maps.Map) => {
      const bounds = new google.maps.LatLngBounds()
      bounds.extend({ lat: shopLat, lng: shopLng })
      bounds.extend({ lat: destLat, lng: destLng })
      if (displayLat != null && displayLng != null) {
        bounds.extend({ lat: displayLat, lng: displayLng })
      }
      map.fitBounds(bounds, 56)
    },
    [shopLat, shopLng, destLat, destLng, displayLat, displayLng],
  )

  useEffect(() => {
    if (mapRef.current) fitMapBounds(mapRef.current)
  }, [fitMapBounds, displayLat, displayLng, status])

  const riderIcon = useMemo(() => {
    if (typeof google === 'undefined') return undefined
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 6,
      fillColor: '#FF6B35',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      rotation: bearing,
    }
  }, [bearing])

  if (!apiKey || mapError) {
    return (
      <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/30 px-4 text-center text-sm text-gray-500">
        <p>Live map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=${shopLat},${shopLng}&destination=${destLat},${destLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-xs font-bold text-orange-500 hover:underline"
        >
          Open route in Google Maps →
        </a>
      </div>
    )
  }

  const distToCustomer =
    showRider && displayLat != null && displayLng != null
      ? distanceKm(displayLat, displayLng, destLat, destLng)
      : null

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 shadow-sm">
      <LoadScript googleMapsApiKey={apiKey} onError={() => setMapError(true)}>
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={14}
          onLoad={(map) => {
            mapRef.current = map
            fitMapBounds(map)
          }}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'greedy',
            mapTypeControl: false,
            streetViewControl: false,
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
            title="Your location"
          />
          {showRider && displayLat != null && displayLng != null && (
            <Marker
              position={{ lat: displayLat, lng: displayLng }}
              icon={riderIcon}
              title="Rider — live GPS"
            />
          )}
          <Polyline
            path={routeLine}
            options={{
              strokeColor: '#FF6B35',
              strokeOpacity: 0.85,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        </GoogleMap>
      </LoadScript>
      {status === 'OUT_FOR_DELIVERY' && !showRider && (
        <p className="flex items-center justify-center gap-2 bg-white py-2 text-[10px] font-semibold text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
          Locating rider on map…
        </p>
      )}
      {showRider && status === 'OUT_FOR_DELIVERY' && (
        <p className="bg-white py-2 text-center text-[10px] font-bold text-[#0C831F]">
          🛵 Live GPS tracking
          {distToCustomer != null && distToCustomer < 0.3
            ? ' — rider is near you!'
            : distToCustomer != null
              ? ` — ${distToCustomer.toFixed(1)} km away`
              : ''}
        </p>
      )}
    </div>
  )
}
