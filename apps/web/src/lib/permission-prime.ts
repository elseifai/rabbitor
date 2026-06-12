'use client'

// PLATFORM CORE RESOLUTION — upfront device capability priming on app mount
const PRIMED_KEY = 'rabbit-permissions-primed'

export function isUnencryptedHttp(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')
}

export function gpsHttpHint(): string {
  return 'GPS disabled over unencrypted HTTP connections. Please enter your address below.'
}

export async function primeDevicePermissions(): Promise<void> {
  if (typeof window === 'undefined') return
  if (sessionStorage.getItem(PRIMED_KEY) === '1') return

  sessionStorage.setItem(PRIMED_KEY, '1')

  // Notifications (non-blocking)
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      /* user dismissed */
    }
  }

  // Camera — warm up permission prompt context (getUserMedia requires user gesture on some browsers;
  // we only probe if already granted to avoid spurious errors)
  if (navigator.mediaDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasVideo = devices.some((d) => d.kind === 'videoinput')
      if (hasVideo && navigator.permissions) {
        await navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null)
      }
    } catch {
      /* optional */
    }
  }

  // Geolocation — soft probe; full detect happens on user action
  if (navigator.geolocation && navigator.permissions) {
    try {
      await navigator.permissions.query({ name: 'geolocation' })
    } catch {
      /* optional */
    }
  }
}
