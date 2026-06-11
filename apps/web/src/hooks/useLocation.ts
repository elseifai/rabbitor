'use client'

import { useEffect } from 'react'
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
    const label =
      data.display_name?.split(',').slice(0, 3).join(', ') || area
    return { area, city, label }
  } catch {
    return { area: DEFAULT_AREA, city: DEFAULT_CITY, label: DEFAULT_AREA }
  }
}

export function useLocation(): UseLocationResult {
  const coordinates = useLocationStore((s) => s.coordinates)
  const formattedAddress = useLocationStore((s) => s.formattedAddress)
  const isFetching = useLocationStore((s) => s.isFetching)
  const permissionStatus = useLocationStore((s) => s.permissionStatus)
  const setLocation = useLocationStore((s) => s.setLocation)
  const setPermission = useLocationStore((s) => s.setPermission)
  const setFetching = useLocationStore((s) => s.setFetching)
  const setError = useLocationStore((s) => s.setError)

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device')
      return
    }

    setFetching(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const geo = await reverseGeocode(latitude, longitude)
        setLocation(latitude, longitude, geo.label)
        setPermission('granted')
      },
      (err) => {
        console.warn('Location error:', err.message)
        if (err.code === err.PERMISSION_DENIED) {
          setPermission('denied')
          setError('Location permission denied')
        } else {
          setError(err.message || 'Unable to detect location')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  useEffect(() => {
    if (!coordinates) {
      requestLocation()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayArea = formattedAddress?.split(',')[0]?.trim() ?? DEFAULT_AREA

  return {
    lat: coordinates?.lat ?? DEFAULT_LAT,
    lng: coordinates?.lng ?? DEFAULT_LNG,
    area: displayArea,
    city: formattedAddress?.split(',')[1]?.trim() ?? DEFAULT_CITY,
    isDetecting: isFetching,
    permissionDenied: permissionStatus === 'denied',
    requestLocation,
  }
}
