'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Loader2 } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction } from '@/actions/auth'
import { useAuth } from '@/context/AuthContext'

export default function MerchantLoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendOtp = async () => {
    setError(null)
    setLoading(true)
    const res = await requestEmailOtpAction(email, 'VENDOR')
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Failed to send code')
    setDevCode(res.devCode ?? null)
    setStep('otp')
  }

  const verify = async () => {
    setError(null)
    setLoading(true)
    const res = await verifyEmailOtpAction(email, otp, 'VENDOR')
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Verification failed')
    if (res.user.role !== 'VENDOR') {
      setError('This email is not registered as a merchant.')
      return
    }
    login(res.token, res.user)
    router.push('/merchant')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Merchant login</h1>
      <p className="mt-1 text-sm text-gray-500">Sign in with your email or Google</p>

      <a
        href="/api/auth/google/start?role=VENDOR&redirect=/merchant"
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-semibold text-gray-800 hover:bg-gray-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Continue with Google
      </a>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
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
              placeholder="you@shop.com"
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4"
            />
          </div>
          <button
            type="button"
            onClick={() => void sendOtp()}
            disabled={loading || !email}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send code
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            We sent a 6-digit code and a sign-in link to <strong>{email}</strong>.
          </p>
          {devCode && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm">
              Dev code: <strong>{devCode}</strong>
            </p>
          )}
          <input
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit code"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-2xl tracking-widest"
          />
          <button
            type="button"
            onClick={() => void verify()}
            disabled={loading || otp.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enter dashboard
          </button>
          <button
            type="button"
            onClick={() => { setStep('email'); setOtp(''); setError(null) }}
            className="w-full text-sm text-gray-500"
          >
            Use a different email
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <Link href="/" className="mt-6 block text-center text-sm text-gray-500">
        ← Customer app
      </Link>
    </div>
  )
}
