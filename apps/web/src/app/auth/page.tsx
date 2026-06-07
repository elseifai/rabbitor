'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, MapPin } from 'lucide-react'
import { requestOtpAction, verifyOtpAction } from '@/actions/auth'
import { useAuth } from '@/context/AuthContext'

const REDIRECT: Record<string, string> = {
  CUSTOMER: '/',
  VENDOR: '/merchant',
  RABBITOR: '/delivery',
  ADMIN: '/admin',
}

const ROLE_WELCOME: Record<string, string> = {
  CUSTOMER: '🛒 Ready to shop from local stores!',
  VENDOR: '🏪 Manage your shop & orders',
  RABBITOR: '🐰 Ready to deliver happiness!',
  ADMIN: '👑 Welcome back, Admin',
}

const RESEND_SECONDS = 60

export default function AuthPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [step, setStep] = useState<1 | 2>(1)
  const [phone, setPhone] = useState('')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const [locationGranted, setLocationGranted] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend OTP
  useEffect(() => {
    if (step !== 2) return
    setCountdown(RESEND_SECONDS)
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  // Request location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationGranted(true),
        () => {},
        { timeout: 5000 },
      )
    }
  }, [])

  const otp = digits.join('')

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length < 10) return
    setLoading(true)
    setError(null)
    const res = await requestOtpAction(phone)
    setLoading(false)
    if (!res.ok) { setError(res.error); return }
    setDevCode(res.devCode ?? null)
    setStep(2)
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  const handleVerify = async () => {
    if (otp.length < 6) return
    setLoading(true)
    setError(null)
    const res = await verifyOtpAction(phone, otp)
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Invalid OTP. Please try again.')
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
      return
    }
    login(res.token, res.user)
    router.push(REDIRECT[res.user.role] ?? '/')
    router.refresh()
  }

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full OTP
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const next = value.split('')
      setDigits(next)
      inputRefs.current[5]?.focus()
      setTimeout(() => {
        void handleVerify()
      }, 100)
      return
    }
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    // Auto-submit when all 6 filled
    if (next.every(Boolean) && next.join('').length === 6) {
      setTimeout(() => void handleVerify(), 100)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setDigits(['', '', '', '', '', ''])
    setError(null)
    setLoading(true)
    const res = await requestOtpAction(phone)
    setLoading(false)
    if (!res.ok) { setError(res.error); return }
    setDevCode(res.devCode ?? null)
    setCountdown(RESEND_SECONDS)
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  const maskedPhone = phone.length >= 10
    ? `+91 ${phone.slice(0, 2)}XXXXXX${phone.slice(-2)}`
    : `+91 ${phone}`

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        {step === 2 && (
          <button
            type="button"
            onClick={() => { setStep(1); setDigits(['', '', '', '', '', '']); setError(null) }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6B35] text-lg font-black text-white">
          🐰
        </div>
        <span className="text-lg font-black text-gray-900">Rabbit</span>
      </div>

      <div className="flex flex-1 flex-col px-6 pt-6">
        {step === 1 ? (
          <>
            <h1 className="text-2xl font-black text-gray-900">Enter your mobile number</h1>
            <p className="mt-1 text-sm text-gray-500">
              We&apos;ll send a 6-digit OTP to verify your number
            </p>

            {/* Location permission hint */}
            {!locationGranted && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-orange-50 p-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B35]" />
                <p className="text-xs text-orange-700">
                  Allow location access for better delivery experience — we&apos;ll ask after login.
                </p>
              </div>
            )}

            <form onSubmit={(e) => void handleSendOtp(e)} className="mt-8 space-y-4">
              {/* Phone input */}
              <div className="flex items-center overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50 focus-within:border-[#FF6B35] focus-within:bg-white">
                <span className="flex h-14 items-center border-r border-gray-200 bg-white px-4 text-sm font-bold text-gray-700">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  autoFocus
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="h-14 flex-1 bg-transparent px-4 text-base font-bold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={phone.length < 10 || loading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-base font-bold text-white shadow-lg shadow-orange-100 transition active:scale-95 disabled:opacity-40"
              >
                {loading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <>Get OTP <ArrowRight className="h-5 w-5" /></>
                }
              </button>
            </form>

            {/* Test accounts hint (only dev) */}
            {devCode !== undefined && process.env.NODE_ENV !== 'production' && (
              <div className="mt-6 rounded-xl border border-dashed border-gray-200 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Test Accounts</p>
                {[
                  { phone: '9666666666', role: 'Customer' },
                  { phone: '9111111111', role: 'Kirana Merchant' },
                  { phone: '9444444444', role: 'Rider' },
                  { phone: '9000000000', role: 'Admin' },
                ].map((acc) => (
                  <button
                    key={acc.phone}
                    type="button"
                    onClick={() => setPhone(acc.phone)}
                    className="mr-2 mt-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                  >
                    {acc.role}: {acc.phone}
                  </button>
                ))}
                <p className="mt-2 text-[10px] text-gray-400">OTP: 123456</p>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-gray-900">Verify OTP</h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter the 6-digit code sent to <span className="font-bold text-gray-800">{maskedPhone}</span>
            </p>

            {devCode && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                Dev OTP: <strong className="text-lg tracking-widest">{devCode}</strong>
              </div>
            )}

            {/* 6 digit boxes */}
            <div className="mt-8 flex gap-2.5">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`h-14 w-full rounded-xl border-2 text-center text-xl font-black text-gray-900 outline-none transition ${
                    d
                      ? 'border-[#FF6B35] bg-orange-50'
                      : 'border-gray-200 bg-gray-50 focus:border-[#FF6B35] focus:bg-white'
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            {/* Verify button */}
            <button
              type="button"
              disabled={otp.length < 6 || loading}
              onClick={() => void handleVerify()}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-base font-bold text-white shadow-lg shadow-orange-100 transition active:scale-95 disabled:opacity-40"
            >
              {loading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : 'Verify & Continue'
              }
            </button>

            {/* Resend */}
            <div className="mt-4 text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">
                  Resend OTP in{' '}
                  <span className="font-bold text-[#FF6B35]">0:{countdown.toString().padStart(2, '0')}</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  className="text-sm font-bold text-[#FF6B35] underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <p className="px-6 py-4 text-center text-[11px] text-gray-400">
        By continuing, you agree to Rabbit&apos;s{' '}
        <span className="underline">Terms of Service</span> &amp;{' '}
        <span className="underline">Privacy Policy</span>
      </p>
    </div>
  )
}
