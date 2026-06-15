'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getRiderProfileStatusAction } from '@/actions/rider-onboarding'
import { useAuth } from '@/context/AuthContext'
import { roleCanAccessPortal } from '@/lib/auth-routing'

export function DeliveryPortalGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoggedIn, hydrated } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!hydrated) return

    if (!isLoggedIn || !user || !roleCanAccessPortal(user.role, 'RABBITOR')) {
      router.replace('/delivery/login')
      return
    }

    let cancelled = false
    void (async () => {
      const res = await getRiderProfileStatusAction()
      if (cancelled) return
      if (!res.ok || !res.status.isOnboarded) {
        router.replace('/delivery/login?setup=1')
        return
      }
      setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [hydrated, isLoggedIn, user, router])

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" />
        Loading partner console…
      </div>
    )
  }

  return <>{children}</>
}
