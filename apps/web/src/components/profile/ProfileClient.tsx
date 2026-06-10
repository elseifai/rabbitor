'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2, Mail } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction, logoutAction } from '@/actions/auth'

type Props = {
  user: {
    name: string | null
    phone: string | null
    email?: string | null
    displayName: string | null
  } | null
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return ''
  if (phone.length < 10) return phone
  return `+91 ${phone.slice(0, 2)}XXXX${phone.slice(-4)}`
}

export function ProfileClient({ user: serverUser }: Props) {
  const router = useRouter()
  const [localUser, setLocalUser] = useState<{ name?: string; email?: string } | null>(null)
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rabbit_user')
      if (stored) setLocalUser(JSON.parse(stored))
    } catch {
      setLocalUser(null)
    }
  }, [])

  const user = serverUser ?? (localUser?.email ? {
    name: localUser.name ?? 'User',
    phone: null,
    email: localUser.email,
    displayName: localUser.name ?? null,
  } : null)

  const sendOtp = async () => {
    setLoading(true)
    setError(null)
    const res = await requestEmailOtpAction(email, 'CUSTOMER')
    setLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setStep('otp')
  }

  const verify = async () => {
    setLoading(true)
    setError(null)
    const res = await verifyEmailOtpAction(email, otp, 'CUSTOMER')
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Verification failed')
      return
    }
    localStorage.setItem('rabbit_user', JSON.stringify({ email, name: res.user.name ?? email }))
    router.refresh()
  }

  const logout = async () => {
    await logoutAction()
    localStorage.removeItem('rabbit_token')
    localStorage.removeItem('rabbit_user')
    setLocalUser(null)
    router.refresh()
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900">Login to Rabbit</h1>
        <p className="mt-1 text-sm text-gray-500">Use your email or continue with Google</p>

        <a
          href="/api/auth/google/start?role=CUSTOMER&redirect=/profile"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-semibold text-gray-800 hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
          Continue with Google
        </a>

        <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          OR
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {step === 'email' ? (
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              disabled={!emailValid || loading}
              onClick={sendOtp}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 font-semibold text-white disabled:opacity-40"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Code sent to {email}</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              className="w-full rounded-xl border border-gray-200 py-3 px-4 text-center text-2xl tracking-[0.5em]"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              disabled={otp.length !== 6 || loading}
              onClick={verify}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 font-semibold text-white disabled:opacity-40"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify & Login
            </button>
          </div>
        )}
      </div>
    )
  }

  const initials = (user.displayName ?? user.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const menu = [
    { label: 'My Orders', href: '/orders' },
    { label: 'Help & Support', href: '#' },
  ]

  return (
    <div className="mx-auto max-w-[480px] px-4 py-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF0EA] text-2xl font-black text-[#FF6B35]">
          {initials}
        </div>
        <h1 className="mt-3 text-lg font-bold">{user.displayName ?? user.name}</h1>
        <p className="text-sm text-gray-500">{maskPhone(user.phone) || user.email}</p>
      </div>

      <div className="mt-8 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
        {menu.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between px-4 py-4 text-sm font-semibold text-gray-800"
          >
            {item.label}
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
        ))}
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-between px-4 py-4 text-sm font-semibold text-red-500"
        >
          Logout
          <ChevronRight className="h-4 w-4 text-red-300" />
        </button>
      </div>
    </div>
  )
}
