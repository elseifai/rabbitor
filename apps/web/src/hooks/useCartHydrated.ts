'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store'

/** Wait for persisted cart state from localStorage before rendering cart UI. */
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const finish = () => setHydrated(true)
    const unsub = useCartStore.persist.onFinishHydration(finish)
    if (useCartStore.persist.hasHydrated()) finish()
    return unsub
  }, [])

  return hydrated
}
