'use client'

import { useEffect, useRef } from 'react'
import { fetchCurrentAuth } from '@/lib/client-auth'
import { requestNotificationPermission } from '@/lib/fcm-client'

export function FcmInit() {
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    requested.current = true

    fetchCurrentAuth()
      .then((session) => {
        if (session?.user.role === 'CUSTOMER') {
          void requestNotificationPermission().catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  return null
}
