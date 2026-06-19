'use client'

import { useEffect } from 'react'
import { clearStaleClientCaches } from '@/lib/clear-stale-caches'
import { primeDevicePermissions } from '@/lib/permission-prime'

// PLATFORM CORE RESOLUTION — root mount permission priming
export function AppStartupProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only purge stale dev caches locally — production refresh was wiping image cache.
    if (process.env.NODE_ENV !== 'production') {
      void clearStaleClientCaches().then(() => primeDevicePermissions())
      return
    }
    void primeDevicePermissions()
  }, [])

  return <>{children}</>
}
