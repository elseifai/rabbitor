'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Phone, ArrowLeft, Loader2 } from 'lucide-react'
import { requestOtpAction, verifyOtpAction } from '@/actions/auth'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendOtp = async () => {
    setLoading(true)
    setError(null)
    const res = await requestOtpAction(phone)
    setLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setDevCode(res.devCode ?? null)
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
    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <h1 className="mt-6 font-display text-2xl font-bold">Login with OTP</h1>
      <p className="mt-1 text-sm text-gray-500">
        Enter your mobile number. We&apos;ll send a one-time password.
      </p>

      {step === 'phone' ? (
        <div className="mt-8 space-y-4">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-lg tracking-wide"
            />
          </div>
          <button
            type="button"
            disabled={phone.length !== 10 || loading}
            onClick={sendOtp}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send OTP
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-600">
            OTP sent to +91 {phone}
            {devCode && (
              <span className="mt-1 block rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                Dev OTP: <strong>{devCode}</strong>
              </span>
            )}
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit OTP"
            className="w-full rounded-xl border border-gray-200 py-3 px-4 text-center text-2xl tracking-[0.5em]"
          />
          <button
            type="button"
            disabled={otp.length !== 6 || loading}
            onClick={verify}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify & continue
          </button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="w-full text-sm text-gray-500"
          >
            Change number
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <p className="mt-8 text-xs text-gray-400">
        Merchant demo: use <strong>9876543210</strong> at{' '}
        <Link href="/merchant/login" className="text-rabbit-600">
          merchant login
        </Link>
      </p>
    </div>
  )
}
