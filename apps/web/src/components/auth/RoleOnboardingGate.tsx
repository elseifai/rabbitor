'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getOnboardingStatusAction } from '@/actions/onboarding'
import { useAuth } from '@/context/AuthContext'

const ONBOARDING_EXEMPT = [
  '/merchant/onboarding',
  '/delivery/login',
  '/auth',
  '/merchant/login',
  '/checkout',
  '/cart',
]

export function RoleOnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoggedIn, hydrated } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!hydrated || !isLoggedIn || !user) {
      setReady(true)
      return
    }

    if (user.role !== 'VENDOR' && user.role !== 'RABBITOR') {
      setReady(true)
      return
    }

    if (ONBOARDING_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      setReady(true)
      return
    }

    let cancelled = false
    void (async () => {
      const status = await getOnboardingStatusAction()
      if (cancelled) return
      if (status && !status.complete && status.nextPath) {
        router.replace(status.nextPath)
        return
      }
      setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [hydrated, isLoggedIn, user, pathname, router])

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Preparing your workspace…
      </div>
    )
  }

  return <>{children}</>
}
