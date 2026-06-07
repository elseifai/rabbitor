'use client'

import { useEffect, useRef } from 'react'
import { getSessionAction } from '@/actions/auth'
import { requestNotificationPermission } from '@/lib/fcm-client'

export function FcmInit() {
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    requested.current = true

    getSessionAction()
      .then((session) => {
        if (session?.role === 'CUSTOMER') {
          void requestNotificationPermission().catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  return null
}
