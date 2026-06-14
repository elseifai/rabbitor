'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { isDevSandboxClient } from '@/lib/dev-auth'
import {
  defaultDashboardForRole,
  isPublicAuthPath,
  loginPathForRole,
  roleHintFromPathname,
  roleMatchesPath,
} from '@/lib/auth-routing'
import { RoleOnboardingGate } from '@/components/auth/RoleOnboardingGate'

/**
 * Client-side auth guard — complements edge middleware.
 * Production: every non-public route requires a session and matching role.
 */
export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, hydrated, user } = useAuth()
  const sandbox = isDevSandboxClient()

  const isPublic = isPublicAuthPath(pathname)
  const shouldGate = !isPublic

  useEffect(() => {
    if (!hydrated || !shouldGate) return

    if (!isLoggedIn) {
      router.replace(loginPathForRole(roleHintFromPathname(pathname), pathname))
      return
    }

    if (user && !roleMatchesPath(user.role, pathname)) {
      router.replace(defaultDashboardForRole(user.role))
    }
  }, [hydrated, isLoggedIn, shouldGate, pathname, router, user])

  if (shouldGate && (!hydrated || !isLoggedIn)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm font-semibold text-slate-400">
        Redirecting to sign in…
      </div>
    )
  }

  if (shouldGate && user && !roleMatchesPath(user.role, pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm font-semibold text-slate-400">
        Redirecting…
      </div>
    )
  }

  return <RoleOnboardingGate>{children}</RoleOnboardingGate>
}
