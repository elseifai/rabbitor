'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, Loader2, Shield } from 'lucide-react'
import { requestOtpAction, verifyOtpAction } from '@/actions/auth'

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('9111111111')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendOtp = async () => {
    setLoading(true)
    setError(null)
    const res = await requestOtpAction(phone)
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Failed to send OTP')
    setDevCode(res.devCode ?? null)
    setStep('otp')
  }

  const verify = async () => {
    setLoading(true)
    setError(null)
    const res = await verifyOtpAction(phone, otp)
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Invalid OTP')
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F8FAFC] px-4 py-12 font-sans">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Admin login</h1>
          <p className="text-sm text-slate-500">Platform super-admin access</p>
        </div>
      </div>

      {step === 'phone' ? (
        <div className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Admin phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-[#FF6B35] focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void sendOtp()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
          </button>
        </div>
      ) : (
        <div className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          {devCode && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-800">
              Dev OTP: {devCode}
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit OTP"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg font-black tracking-[0.3em] focus:border-[#FF6B35] focus:outline-none"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void verify()}
            className="w-full rounded-xl bg-[#FF6B35] py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Enter Admin Center'}
          </button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="w-full text-xs font-bold text-slate-400"
          >
            Change number
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600">{error}</p>
      )}

      <Link href="/" className="mt-8 block text-center text-sm font-semibold text-slate-500">
        ← Back to home
      </Link>
    </div>
  )
}
