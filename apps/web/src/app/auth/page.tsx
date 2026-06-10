'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction } from '@/actions/auth'
import { useAuth } from '@/context/AuthContext'

const REDIRECT: Record<string, string> = {
  CUSTOMER: '/',
  VENDOR: '/merchant',
  RABBITOR: '/delivery',
  ADMIN: '/admin',
}

const RESEND_SECONDS = 60

export default function AuthPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend code
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

  const otp = digits.join('')
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValid) return
    setLoading(true)
    setError(null)
    const res = await requestEmailOtpAction(email)
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
    const res = await verifyEmailOtpAction(email, otp)
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Invalid code. Please try again.')
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
      return
    }
    login(res.token, res.user)
    router.push(REDIRECT[res.user.role] ?? '/')
    router.refresh()
  }

  const handleDigitChange = (index: number, value: string) => {
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const next = value.split('')
      setDigits(next)
      inputRefs.current[5]?.focus()
      setTimeout(() => { void handleVerify() }, 100)
      return
    }
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
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
    const res = await requestEmailOtpAction(email)
    setLoading(false)
    if (!res.ok) { setError(res.error); return }
    setDevCode(res.devCode ?? null)
    setCountdown(RESEND_SECONDS)
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

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
            <h1 className="text-2xl font-black text-gray-900">Sign in to Rabbit</h1>
            <p className="mt-1 text-sm text-gray-500">
              We&apos;ll email you a 6-digit code and a sign-in link
            </p>

            {/* Google SSO */}
            <a
              href="/api/auth/google/start?redirect=/"
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 text-base font-bold text-gray-800 transition active:scale-95 hover:bg-gray-50"
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

            <form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4">
              <div className="flex items-center overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50 focus-within:border-[#FF6B35] focus-within:bg-white">
                <span className="flex h-14 items-center border-r border-gray-200 bg-white px-4">
                  <Mail className="h-4 w-4 text-gray-500" />
                </span>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                disabled={!emailValid || loading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-base font-bold text-white shadow-lg shadow-orange-100 transition active:scale-95 disabled:opacity-40"
              >
                {loading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <>Get code <ArrowRight className="h-5 w-5" /></>
                }
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-gray-900">Enter the code</h1>
            <p className="mt-1 text-sm text-gray-500">
              We sent a 6-digit code and a sign-in link to{' '}
              <span className="font-bold text-gray-800">{email}</span>
            </p>

            {devCode && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                Dev code: <strong className="text-lg tracking-widest">{devCode}</strong>
              </div>
            )}

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

            <div className="mt-4 text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">
                  Resend code in{' '}
                  <span className="font-bold text-[#FF6B35]">0:{countdown.toString().padStart(2, '0')}</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  className="text-sm font-bold text-[#FF6B35] underline"
                >
                  Resend code
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
