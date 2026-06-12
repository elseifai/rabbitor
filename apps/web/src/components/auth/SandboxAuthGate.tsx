'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { isDevSandboxClient } from '@/lib/dev-auth'

/** DEV SANDBOX REFACTOR — paths that skip the global unauthenticated redirect. */
const AUTH_EXEMPT_PREFIXES = [
  '/auth',
  '/login',
  '/checkout',
  '/profile',
  '/merchant',
  '/admin',
  '/delivery',
  '/rabbitor',
  '/track',
  '/api',
] as const

function isAuthExemptPath(pathname: string): boolean {
  return AUTH_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/**
 * DEV SANDBOX REFACTOR — redirect unauthenticated users to the role picker on first launch.
 */
export function SandboxAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, hydrated } = useAuth()

  const sandbox = isDevSandboxClient()
  const exempt = isAuthExemptPath(pathname)

  useEffect(() => {
    if (!sandbox || !hydrated || exempt || isLoggedIn) return
    router.replace(`/auth?redirect=${encodeURIComponent(pathname)}`)
  }, [sandbox, hydrated, exempt, isLoggedIn, pathname, router])

  if (!sandbox || exempt) {
    return <>{children}</>
  }

  if (!hydrated || !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm font-semibold text-slate-400">
        Opening sandbox login…
      </div>
    )
  }

  return <>{children}</>
}
