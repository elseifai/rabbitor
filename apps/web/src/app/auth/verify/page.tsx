'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, XCircle } from 'lucide-react'
import { verifyEmailTokenAction } from '@/actions/auth'
import { useAuth } from '@/context/AuthContext'

const ROLE_HOME: Record<string, string> = {
  VENDOR: '/merchant',
  RABBITOR: '/delivery',
  ADMIN: '/admin',
  CUSTOMER: '/',
}

export default function VerifyMagicLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying')
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setError('Missing verification token.')
      return
    }
    verifyEmailTokenAction(token).then((res) => {
      if (!res.ok) {
        setStatus('error')
        setError(res.error ?? 'Verification failed.')
        return
      }
      login(res.token, res.user)
      router.replace(ROLE_HOME[res.user.role] ?? '/')
      router.refresh()
    })
  }, [searchParams, login, router])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      {status === 'verifying' ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-rabbit-600" />
          <p className="mt-4 text-sm text-gray-600">Verifying your link…</p>
        </>
      ) : (
        <>
          <XCircle className="h-10 w-10 text-red-500" />
          <p className="mt-4 font-semibold">{error}</p>
          <Link href="/auth" className="mt-6 text-sm text-rabbit-600">
            Back to login
          </Link>
        </>
      )}
    </div>
  )
}
