'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Loader2, Shield } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction } from '@/actions/auth'
import { useAuth } from '@/context/AuthContext'

export default function AdminLoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const sendOtp = async () => {
    setLoading(true)
    setError(null)
    const res = await requestEmailOtpAction(email)
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Failed to send code')
    setDevCode(res.devCode ?? null)
    setStep('otp')
  }

  const verify = async () => {
    setLoading(true)
    setError(null)
    const res = await verifyEmailOtpAction(email, otp)
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Invalid code')
    if (res.user.role !== 'ADMIN') {
      setError('This email is not registered as admin.')
      return
    }
    login(res.token, res.user)
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

      {step === 'email' ? (
        <div className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Admin email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@rabbit.com"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-[#FF6B35] focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={!emailValid || loading}
            onClick={() => void sendOtp()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send code'}
          </button>
          <a
            href="/api/auth/google/start?redirect=/admin"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continue with Google
          </a>
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
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit code"
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
            onClick={() => setStep('email')}
            className="w-full text-xs font-bold text-slate-400"
          >
            Use a different email
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
