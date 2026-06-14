'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { isDevSandboxClient } from '@/lib/dev-auth'
import {
  isPublicAuthPath,
  loginPathForRole,
  roleHintFromPathname,
} from '@/lib/auth-routing'
import { RoleOnboardingGate } from '@/components/auth/RoleOnboardingGate'

/**
 * Client-side auth guard — complements edge middleware.
 * Production: every non-public route requires a session.
 */
export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, hydrated } = useAuth()
  const sandbox = isDevSandboxClient()

  const isPublic = isPublicAuthPath(pathname)
  const shouldGate = sandbox ? !isPublic : !isPublic

  useEffect(() => {
    if (!hydrated || isLoggedIn || !shouldGate) return
    router.replace(loginPathForRole(roleHintFromPathname(pathname), pathname))
  }, [hydrated, isLoggedIn, shouldGate, pathname, router])

  if (shouldGate && (!hydrated || !isLoggedIn)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm font-semibold text-slate-400">
        Redirecting to sign in…
      </div>
    )
  }

  return <RoleOnboardingGate>{children}</RoleOnboardingGate>
}
