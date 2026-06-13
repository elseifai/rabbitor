'use client'

import { useCallback, useEffect, useRef } from 'react'
import { getAuthHeader } from '@/lib/session'

// GOOGLE MAPS & AUTH ACTIVATION — background rider coordinate streaming (10s + watchPosition)
export function useRiderLocationStream(options?: {
  orderId?: string
  enabled?: boolean
  intervalMs?: number
  onError?: (message: string) => void
}) {
  const enabled = options?.enabled ?? true
  const intervalMs = options?.intervalMs ?? 10_000
  const watchIdRef = useRef<number | null>(null)
  const lastPostRef = useRef(0)
  const onError = options?.onError
  const orderId = options?.orderId

  const postLocation = useCallback(
    async (lat: number, lng: number) => {
      const now = Date.now()
      if (now - lastPostRef.current < intervalMs - 500) return
      lastPostRef.current = now

      try {
        await fetch('/api/rider/update-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          credentials: 'include',
          body: JSON.stringify({ lat, lng, orderId }),
        })
      } catch {
        onError?.('Could not sync rider location')
      }
    },
    [intervalMs, onError, orderId],
  )

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      onError?.('Geolocation is not available')
      return
    }

    const onPosition = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords
      void postLocation(latitude, longitude)
    }

    const onGeoError = (err: GeolocationPositionError) => {
      onError?.(err.message || 'GPS unavailable')
    }

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onGeoError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    })

    const intervalId = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(onPosition, () => undefined, {
        enableHighAccuracy: true,
        maximumAge: intervalMs,
        timeout: 12000,
      })
    }, intervalMs)

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      window.clearInterval(intervalId)
    }
  }, [enabled, intervalMs, onError, postLocation])
}
