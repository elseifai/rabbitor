'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2, Phone } from 'lucide-react'
import { requestOtpAction, verifyOtpAction, logoutAction } from '@/actions/auth'

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
  const [localUser, setLocalUser] = useState<{ name?: string; phone?: string } | null>(null)
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rabbit_user')
      if (stored) setLocalUser(JSON.parse(stored))
    } catch {
      setLocalUser(null)
    }
  }, [])

  const user = serverUser ?? (localUser?.phone ? {
    name: localUser.name ?? 'User',
    phone: localUser.phone,
    displayName: localUser.name ?? null,
  } : null)

  const sendOtp = async () => {
    setLoading(true)
    setError(null)
    const res = await requestOtpAction(phone)
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
    const res = await verifyOtpAction(phone, otp, 'CUSTOMER')
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Verification failed')
      return
    }
    localStorage.setItem('rabbit_user', JSON.stringify({ phone, name: `User ${phone.slice(-4)}` }))
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
        <p className="mt-1 text-sm text-gray-500">Enter your mobile number for OTP login</p>
        {step === 'phone' ? (
          <div className="mt-6 space-y-4">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              disabled={phone.length !== 10 || loading}
              onClick={sendOtp}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 font-semibold text-white disabled:opacity-40"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send OTP
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-600">OTP sent to +91 {phone}</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit OTP"
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
