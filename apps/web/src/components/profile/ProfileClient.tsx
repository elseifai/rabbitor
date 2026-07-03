'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  LogOut,
  MessageCircle,
  Package,
  Phone,
  Rabbit,
  Sparkles,
} from 'lucide-react'
import { requestOtpAction, verifyOtpAction, logoutAction } from '@/actions/auth'
import { cn } from '@/lib/utils'

type Props = {
  user: { name: string | null; phone: string; displayName: string | null } | null
}

function maskPhone(phone: string) {
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
    { label: 'My Orders', subtitle: 'View all orders', href: '/orders', icon: Package },
    { label: 'Help & Support', subtitle: 'Get help with your account', href: '#', icon: MessageCircle },
  ]

  return (
    <div className="mx-auto min-h-screen max-w-md border-x border-gray-100 bg-[#F8FAFC] pb-12 font-sans">
      {/* App bar */}
      <div className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-[#EEF1F4] bg-white px-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#1E1E1E] transition-colors hover:bg-[#F8FAFC]"
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="text-[22px] font-semibold tracking-tight text-[#1E1E1E]">My Profile</h1>
      </div>

      <div className="flex flex-col gap-6 px-5 pt-5">
        {/* Profile card */}
        <div className="relative overflow-hidden rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F2FAF4] via-white to-white" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#F2FAF4] text-xl font-bold text-[#2FAF5A]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[20px] font-bold text-[#1E1E1E]">
                {user.displayName ?? user.name}
              </h2>
              <p className="mt-1 text-[15px] font-medium text-[#1E1E1E]/80">{maskPhone(user.phone)}</p>
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-[#F2FAF4] px-2.5 py-1 text-[11px] font-semibold text-[#2FAF5A]">
                <Sparkles size={12} strokeWidth={2.5} />
                Rabbit Member
              </span>
            </div>
          </div>
        </div>

        {/* Account menu */}
        <div>
          <h3 className="mb-2.5 pl-1 text-[13px] font-semibold uppercase tracking-wide text-[#7A7A7A]">
            Account
          </h3>
          <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
            {menu.map((item, idx) => {
              const tone = idx % 2 === 0 ? 'orange' : 'green'
              const toneClasses =
                tone === 'orange' ? 'bg-[#FFF4EE] text-[#FF6A3D]' : 'bg-[#F2FAF4] text-[#2FAF5A]'
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex min-h-[72px] items-center gap-3.5 border-b border-[#EEF1F4] px-4 py-3 transition-colors active:bg-[#F8FAFC]"
                >
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClasses)}>
                    <Icon size={19} strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-medium text-[#1E1E1E]">{item.label}</p>
                    <p className="truncate text-[13px] text-[#7A7A7A]">{item.subtitle}</p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-[#7A7A7A]" />
                </Link>
              )
            })}
            <button
              type="button"
              onClick={logout}
              className="flex min-h-[72px] w-full items-center gap-3.5 px-4 py-3 text-left transition-colors active:bg-[#F8FAFC]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4EE] text-[#FF6A3D]">
                <LogOut size={19} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-medium text-[#1E1E1E]">Log Out</p>
                <p className="truncate text-[13px] text-[#7A7A7A]">Sign out of your account</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-[#7A7A7A]" />
            </button>
          </div>
        </div>

        {/* Promotional card */}
        <div className="relative flex h-[110px] items-center justify-between overflow-hidden rounded-[24px] bg-gradient-to-r from-[#F2FAF4] to-[#E3F5E9] px-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[#2FAF5A]">
              <Rabbit size={26} strokeWidth={2} />
            </span>
            <div className="max-w-[130px]">
              <p className="text-[14px] font-semibold text-[#1E1E1E]">Get Free Delivery</p>
              <p className="mt-0.5 text-[12px] leading-tight text-[#7A7A7A]">
                Shop ₹99 more to unlock free delivery
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-full bg-[#FF6A3D] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-transform active:scale-95"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </div>
  )
}
