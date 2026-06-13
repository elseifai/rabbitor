'use client'

import { useEffect } from 'react'
import { clearStaleClientCaches } from '@/lib/clear-stale-caches'
import { primeDevicePermissions } from '@/lib/permission-prime'

// PLATFORM CORE RESOLUTION — root mount permission priming
export function AppStartupProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void clearStaleClientCaches().then(() => primeDevicePermissions())
  }, [])

  return <>{children}</>
}
