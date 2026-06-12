'use client'

import { useEffect } from 'react'
import { primeDevicePermissions } from '@/lib/permission-prime'

// PLATFORM CORE RESOLUTION — root mount permission priming
export function AppStartupProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void primeDevicePermissions()
  }, [])

  return <>{children}</>
}
