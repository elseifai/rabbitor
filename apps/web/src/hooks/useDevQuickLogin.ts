'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import type { DevLoginAccount } from '@/lib/dev-auth'
import type { SessionUser } from '@/lib/session'

type VerifyResponse = {
  success: boolean
  token?: string
  user?: SessionUser
  error?: string
}

type UseDevQuickLoginOptions = {
  /** When false, caller handles navigation (e.g. inline checkout auth). */
  redirectOnSuccess?: boolean
  onSuccess?: (user: SessionUser) => void
  /** DEV SANDBOX REFACTOR — override post-login destination (e.g. return URL from /auth). */
  resolveRedirect?: (account: DevLoginAccount, user: SessionUser) => string
}

/** DEV ONLY BYPASS — shared quick-login handler for sandbox role cards. */
export function useDevQuickLogin(options: UseDevQuickLoginOptions = {}) {
  const { redirectOnSuccess = true, onSuccess, resolveRedirect } = options
  const router = useRouter()
  const { login } = useAuth()
  const [loadingId, setLoadingId] = useState<DevLoginAccount['id'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const quickLogin = useCallback(
    async (account: DevLoginAccount) => {
      setLoadingId(account.id)
      setError(null)

      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: account.phone, otp: account.otp }),
        })

        const data = (await res.json()) as VerifyResponse
        if (!res.ok || !data.success || !data.token || !data.user) {
          setError(
            data.error ?? 'Quick login failed. Run `pnpm db:seed` if test users are missing.',
          )
          return false
        }

        login(data.token, data.user)
        onSuccess?.(data.user)

        if (redirectOnSuccess) {
          const destination = resolveRedirect?.(account, data.user) ?? account.redirect
          router.push(destination)
          router.refresh()
        }

        return true
      } catch {
        setError('Quick login failed. Is the dev server running?')
        return false
      } finally {
        setLoadingId(null)
      }
    },
    [login, onSuccess, redirectOnSuccess, resolveRedirect, router],
  )

  return { quickLogin, loadingId, error, setError }
}
