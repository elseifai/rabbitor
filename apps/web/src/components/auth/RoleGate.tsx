'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { roleCanAccessPortal } from '@/lib/auth-routing'

export function RoleGate({
  role,
  redirectTo,
  children,
}: {
  role: string
  redirectTo: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isLoggedIn, hydrated } = useAuth()
  const allowed = Boolean(
    hydrated && isLoggedIn && user && roleCanAccessPortal(user.role, role),
  )

  useEffect(() => {
    if (!hydrated) return
    if (!allowed) {
      router.replace(redirectTo)
    }
  }, [allowed, hydrated, redirectTo, router])

  if (!hydrated || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
        Checking access…
      </div>
    )
  }

  return <>{children}</>
}
