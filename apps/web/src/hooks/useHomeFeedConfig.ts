'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_HOME_FEED_CONFIG,
  mergeHomeFeedConfig,
  type HomeFeedConfig,
} from '@/lib/home-feed-config'

const HOME_FEED_CACHE_KEY = 'rabbit_home_feed_config_v1'

function readCachedHomeFeedConfig(): HomeFeedConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(HOME_FEED_CACHE_KEY)
    if (!raw) return null
    return mergeHomeFeedConfig(JSON.parse(raw))
  } catch {
    return null
  }
}

export function useHomeFeedConfig() {
  const [config, setConfig] = useState<HomeFeedConfig>(
    () => readCachedHomeFeedConfig() ?? DEFAULT_HOME_FEED_CONFIG,
  )
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/platform/home-feed')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) {
          const merged = mergeHomeFeedConfig(json.data)
          setConfig(merged)
          try {
            sessionStorage.setItem(HOME_FEED_CACHE_KEY, JSON.stringify(json.data))
          } catch {
            // ignore quota errors
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { config, loaded }
}
