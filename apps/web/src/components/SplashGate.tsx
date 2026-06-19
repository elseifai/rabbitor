'use client'

import { useCallback, useEffect, useState } from 'react'
import { RabbitSplashScreen } from '@/components/RabbitSplashScreen'

export function SplashGate({ children }: { children: React.ReactNode }) {
  // null = not yet checked, true = show splash, false = done
  const [showSplash, setShowSplash] = useState<boolean | null>(null)

  useEffect(() => {
    const seen = sessionStorage.getItem('splash_shown')
    setShowSplash(!seen)
  }, [])

  const onDone = useCallback(() => {
    sessionStorage.setItem('splash_shown', '1')
    setShowSplash(false)
  }, [])

  // Don't render anything until we've checked sessionStorage
  // This prevents a flash of children before splash appears
  if (showSplash === null) return null

  if (showSplash) return <RabbitSplashScreen onDone={onDone} />

  // Splash is done — render children only, no overlay
  return <>{children}</>
}
