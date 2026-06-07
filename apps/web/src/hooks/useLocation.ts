'use client'

import { useEffect, useState } from 'react'
import { useLocationStore } from '@/store'

interface UseLocationResult {
  lat: number
  lng: number
  area: string
  city: string
  isDetecting: boolean
  permissionDenied: boolean
  requestLocation: () => void
}

const DEFAULT_LAT = 19.1196
const DEFAULT_LNG = 72.8465
const DEFAULT_AREA = 'Andheri West'
const DEFAULT_CITY = 'Mumbai'

async function reverseGeocode(lat: number, lng: number) {
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
      addr.village ||
      'Near you'
    const city = addr.city || addr.town || addr.state_district || ''
    const pincode = addr.postcode || ''
    const label =
      data.display_name?.split(',').slice(0, 3).join(', ') || area
    return { area, city, pincode, label }
  } catch {
    return { area: DEFAULT_AREA, city: DEFAULT_CITY, pincode: '', label: DEFAULT_AREA }
  }
}

export function useLocation(): UseLocationResult {
  const { location, setLocation } = useLocationStore()
  const [isDetecting, setIsDetecting] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const requestLocation = () => {
    if (!navigator.geolocation) return
    setIsDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const geo = await reverseGeocode(latitude, longitude)
        setLocation({
          label: geo.label,
          area: geo.area,
          city: geo.city,
          pincode: geo.pincode,
          latitude,
          longitude,
        })
        setIsDetecting(false)
        setPermissionDenied(false)
      },
      (err) => {
        console.warn('Location error:', err.message)
        setIsDetecting(false)
        if (err.code === err.PERMISSION_DENIED) setPermissionDenied(true)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  // Auto-detect on first load if no location saved
  useEffect(() => {
    if (!location) {
      requestLocation()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    lat: location?.latitude ?? DEFAULT_LAT,
    lng: location?.longitude ?? DEFAULT_LNG,
    area: location?.area ?? DEFAULT_AREA,
    city: (location as any)?.city ?? DEFAULT_CITY,
    isDetecting,
    permissionDenied,
    requestLocation,
  }
}
