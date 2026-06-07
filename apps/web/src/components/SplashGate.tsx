'use client'

import { useCallback, useEffect, useState } from 'react'
import { RabbitSplashScreen } from '@/components/RabbitSplashScreen'

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = sessionStorage.getItem('splash_shown')
    if (!seen) setShowSplash(true)
  }, [])

  const onDone = useCallback(() => {
    sessionStorage.setItem('splash_shown', '1')
    setShowSplash(false)
  }, [])

  return (
    <>
      {showSplash && <RabbitSplashScreen onDone={onDone} />}
      {children}
    </>
  )
}
