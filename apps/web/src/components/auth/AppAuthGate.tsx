'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { isDevSandboxClient } from '@/lib/dev-auth'
import {
  isProtectedAuthPath,
  isPublicAuthPath,
  loginPathForRole,
} from '@/lib/auth-routing'
import { parseAuthRoleParam } from '@/lib/auth-roles'
import { RoleOnboardingGate } from '@/components/auth/RoleOnboardingGate'

/**
 * Production + sandbox auth guard.
 * - Sandbox: redirect unauthenticated users to /auth (legacy dev flow).
 * - Production: protected routes require sign-in via the multi-role /auth page.
 */
export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, hydrated } = useAuth()
  const sandbox = isDevSandboxClient()

  const isPublic = isPublicAuthPath(pathname)
  const isProtected = isProtectedAuthPath(pathname)
  const shouldGate = sandbox ? !isPublic : isProtected

  useEffect(() => {
    if (!hydrated || isLoggedIn || !shouldGate) return

    const roleHint = pathname.startsWith('/merchant')
      ? 'merchant'
      : pathname.startsWith('/delivery') || pathname.startsWith('/rabbitor')
        ? 'rabbitor'
        : pathname.startsWith('/admin')
          ? 'admin'
          : parseAuthRoleParam(null)

    router.replace(loginPathForRole(roleHint, pathname))
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
