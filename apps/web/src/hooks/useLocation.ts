'use client'

import { useEffect } from 'react'
import { useLocationStore } from '@/store'
import { detectAndSaveLocation } from '@/lib/geolocation-service'

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

export function useLocation(): UseLocationResult {
  const coordinates = useLocationStore((s) => s.coordinates)
  const formattedAddress = useLocationStore((s) => s.formattedAddress)
  const isFetching = useLocationStore((s) => s.isFetching)
  const permissionStatus = useLocationStore((s) => s.permissionStatus)

  const requestLocation = () => {
    void detectAndSaveLocation({ syncDb: true })
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
