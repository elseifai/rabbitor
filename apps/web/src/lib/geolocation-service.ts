'use client'

import { useLocationStore } from '@/store'
import { getAuthHeader } from '@/lib/session'
import { gpsHttpHint, isUnencryptedHttp } from '@/lib/permission-prime'

export type GeoProfileRole = 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN'

// LIVE ECOSYSTEM UPGRADE — triple-profile geolocation sync
export async function reverseGeocodeLabel(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } },
    )
    const data = await res.json()
    const addr = data.address ?? {}
    const area =
      addr.suburb ||
      addr.neighbourhood ||
      addr.city_district ||
      addr.town ||
      'Near you'
    return data.display_name?.split(',').slice(0, 3).join(', ') || area
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

export type ReverseGeocodeDetails = {
  formatted: string
  area: string
  city: string
  pincode: string | null
  line2: string | null
}

export async function reverseGeocodeDetails(lat: number, lng: number): Promise<ReverseGeocodeDetails> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } },
    )
    const data = await res.json()
    const addr = data.address ?? {}
    const area =
      addr.suburb ||
      addr.neighbourhood ||
      addr.city_district ||
      addr.residential ||
      ''
    const city = addr.city || addr.town || addr.state_district || addr.state || 'Mumbai'
    const pincode = addr.postcode ?? null
    const road = addr.road || addr.pedestrian || null
    const formatted =
      data.display_name?.split(',').slice(0, 4).join(', ') ||
      [area, city].filter(Boolean).join(', ') ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    return { formatted, area: area || city, city, pincode, line2: road }
  } catch {
    return {
      formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      area: '',
      city: 'Mumbai',
      pincode: null,
      line2: null,
    }
  }
}

export function detectLivePosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30_000,
    })
  })
}

export async function persistGeoToSession(lat: number, lng: number, address: string) {
  const { setLocation, setFetching, setPermission, setError } = useLocationStore.getState()
  setLocation(lat, lng, address)
  setPermission('granted')
  setFetching(false)
  setError(null)
}

export async function syncGeoToDatabase(input: {
  lat: number
  lng: number
  address?: string
}) {
  try {
    const res = await fetch('/api/user/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      credentials: 'include',
      body: JSON.stringify(input),
    })
    const json = await res.json()
    return { ok: json.success as boolean, error: json.error as string | undefined }
  } catch {
    return { ok: false, error: 'Could not sync location to server' }
  }
}

export async function detectAndSaveLocation(options?: { syncDb?: boolean }) {
  const { setFetching, setError, setPermission } = useLocationStore.getState()
  setFetching(true)
  setError(null)

  // PLATFORM CORE RESOLUTION — skip GPS probe on plain HTTP (VPS dev hosts)
  if (isUnencryptedHttp()) {
    const message = gpsHttpHint()
    setPermission('denied')
    setError(message)
    setFetching(false)
    return {
      ok: false as const,
      error: message,
      denied: true,
      showManualFallback: true,
      httpBlocked: true,
    }
  }

  try {
    const pos = await detectLivePosition()
    const { latitude, longitude } = pos.coords
    const label = await reverseGeocodeLabel(latitude, longitude)
    await persistGeoToSession(latitude, longitude, label)

    if (options?.syncDb !== false) {
      await syncGeoToDatabase({ lat: latitude, lng: longitude, address: label })
    }

    return { ok: true as const, lat: latitude, lng: longitude, address: label }
  } catch (err) {
    const geoErr = err as GeolocationPositionError
    const denied =
      typeof geoErr?.code === 'number' && geoErr.code === geoErr.PERMISSION_DENIED
    const httpBlocked = isUnencryptedHttp()
    const message = httpBlocked
      ? gpsHttpHint()
      : denied
        ? 'Location permission denied'
        : err instanceof Error
          ? err.message
          : 'Unable to detect location'

    if (denied || httpBlocked) {
      setPermission('denied')
    }
    setError(message)
    setFetching(false)
    return {
      ok: false as const,
      error: message,
      denied: denied || httpBlocked,
      showManualFallback: true,
      httpBlocked,
    }
  }
}

export async function saveManualAddress(input: {
  address: string
  lat?: number
  lng?: number
  syncDb?: boolean
}) {
  const lat = input.lat ?? 19.1364
  const lng = input.lng ?? 72.8296
  await persistGeoToSession(lat, lng, input.address.trim())
  if (input.syncDb !== false) {
    await syncGeoToDatabase({ lat, lng, address: input.address.trim() })
  }
  return { ok: true as const, lat, lng }
}
