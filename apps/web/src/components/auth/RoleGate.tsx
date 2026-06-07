'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

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
  const { user, isLoggedIn } = useAuth()

  useEffect(() => {
    if (!isLoggedIn || user?.role !== role) {
      router.replace(redirectTo)
    }
  }, [isLoggedIn, user, role, redirectTo, router])

  if (!isLoggedIn || user?.role !== role) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
        Checking access…
      </div>
    )
  }

  return <>{children}</>
}
