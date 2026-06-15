'use client'

import { useEffect, useState } from 'react'
import type { FeatureFlags } from '@/lib/feature-flags'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/feature-flags'

type PlatformConfig = {
  checkout: {
    globalMinCartValue: number
    multiShopRoutingFeePerLeg: number
    freeDeliveryThreshold: number
  }
  features: FeatureFlags
}

let cached: PlatformConfig | null = null
let inflight: Promise<PlatformConfig | null> | null = null

export function usePlatformConfig() {
  const [config, setConfig] = useState<PlatformConfig | null>(cached)

  useEffect(() => {
    if (cached) {
      setConfig(cached)
      return
    }
    if (!inflight) {
      inflight = fetch('/api/platform/config')
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            cached = json.data as PlatformConfig
            return cached
          }
          return null
        })
        .catch(() => null)
        .finally(() => {
          inflight = null
        })
    }
    void inflight.then((data) => {
      if (data) setConfig(data)
      else
        setConfig({
          checkout: {
            globalMinCartValue: 0,
            multiShopRoutingFeePerLeg: 25,
            freeDeliveryThreshold: 499,
          },
          features: DEFAULT_FEATURE_FLAGS,
        })
    })
  }, [])

  return config
}
