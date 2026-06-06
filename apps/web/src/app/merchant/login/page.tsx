'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, Loader2 } from 'lucide-react'
import { requestOtpAction, verifyOtpAction } from '@/actions/auth'

export default function MerchantLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('9876543210')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendOtp = async () => {
    setLoading(true)
    const res = await requestOtpAction(phone)
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Failed')
    setDevCode(res.devCode ?? null)
    setStep('otp')
  }

  const verify = async () => {
    setLoading(true)
    const res = await verifyOtpAction(phone, otp, 'MERCHANT')
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Failed')
    router.push('/merchant')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Merchant login</h1>
      <p className="mt-1 text-sm text-gray-500">OTP login for shop owners</p>

      {step === 'phone' ? (
        <div className="mt-8 space-y-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="w-full rounded-xl border px-4 py-3"
          />
          <button
            type="button"
            onClick={sendOtp}
            disabled={loading}
            className="w-full rounded-xl bg-rabbit-600 py-3 text-white font-semibold"
          >
            Send OTP
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {devCode && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm">
              Dev OTP: <strong>{devCode}</strong>
            </p>
          )}
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-xl border px-4 py-3 text-center text-2xl tracking-widest"
          />
          <button
            type="button"
            onClick={verify}
            disabled={loading}
            className="w-full rounded-xl bg-rabbit-600 py-3 text-white font-semibold"
          >
            Enter dashboard
          </button>
        </div>
      )}
      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
      <Link href="/" className="mt-6 block text-center text-sm text-gray-500">
        ← Customer app
      </Link>
    </div>
  )
}
