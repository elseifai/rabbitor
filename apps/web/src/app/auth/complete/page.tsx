'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getCurrentUserAction } from '@/actions/auth'
import { useAuth } from '@/context/AuthContext'

const ROLE_REDIRECT: Record<string, string> = {
  CUSTOMER: '/',
  VENDOR: '/merchant',
  RABBITOR: '/delivery',
  ADMIN: '/admin',
}

// GOOGLE MAPS & AUTH ACTIVATION — sync httpOnly cookie session to client after OAuth
export default function AuthCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const redirectTo = searchParams.get('redirect') ?? '/'

    void (async () => {
      const current = await getCurrentUserAction()
      if (!current) {
        setError('Sign-in could not be completed. Please try again.')
        return
      }
      login(current.token, current.user)
      const roleRedirect = ROLE_REDIRECT[current.user.role] ?? '/'
      router.replace(redirectTo === '/' ? roleRedirect : redirectTo)
      router.refresh()
    })()
  }, [login, router, searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      {error ? (
        <>
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <a href="/auth" className="mt-4 text-sm font-bold text-orange-500 hover:underline">
            Back to sign in
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="mt-3 text-sm font-semibold text-gray-600">Completing Google sign-in…</p>
        </>
      )}
    </div>
  )
}
