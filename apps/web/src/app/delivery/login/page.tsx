'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Loader2 } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction } from '@/actions/auth'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { useAuth } from '@/context/AuthContext'

export default function DeliveryLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(searchParams.get('error'))

  const sendOtp = async () => {
    setError(null)
    setLoading(true)
    const res = await requestEmailOtpAction(email, 'RABBITOR')
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Failed to send code')
    setDevCode(res.devCode ?? null)
    setStep('otp')
  }

  const verify = async () => {
    setError(null)
    setLoading(true)
    const res = await verifyEmailOtpAction(email, otp, 'RABBITOR')
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Verification failed')
    if (res.user.role !== 'RABBITOR') {
      setError('This email is not registered as a delivery partner.')
      return
    }
    login(res.token, res.user)
    router.push('/delivery')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Delivery partner login</h1>
      <p className="mt-1 text-sm text-gray-500">Sign in with your email or Google</p>

      <GoogleSignInButton
        role="RABBITOR"
        redirect="/delivery"
        className="mt-8"
      />

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
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4"
            />
          </div>
          <button
            type="button"
            onClick={() => void sendOtp()}
            disabled={loading || !email}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send code
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            We sent a 6-digit code to <strong>{email}</strong>.
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enter delivery dashboard
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
