'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Smartphone, Lock, ArrowRight, Zap, Loader2 } from 'lucide-react'
import { requestOtpAction, verifyOtpAction } from '@/actions/auth'
import { useAuth } from '@/context/AuthContext'

const WELCOME: Record<string, string> = {
  CUSTOMER: 'Welcome back! Ready to shop? 🛒',
  VENDOR: 'Welcome back! Manage your store 🏪',
  RABBITOR: 'Ready to deliver? 🐰',
  ADMIN: 'Welcome back, Admin 👑',
}

const REDIRECT: Record<string, string> = {
  CUSTOMER: '/',
  VENDOR: '/merchant',
  RABBITOR: '/delivery',
  ADMIN: '/admin',
}

export default function MobileAuthPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [welcome, setWelcome] = useState<string | null>(null)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length < 10) return

    setLoading(true)
    setError(null)
    const res = await requestOtpAction(phone)
    setLoading(false)

    if (!res.ok) {
      setError(res.error)
      return
    }

    setDevCode(res.devCode ?? null)
    setStep(2)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 4) return

    setLoading(true)
    setError(null)
    const res = await verifyOtpAction(phone, otp)
    setLoading(false)

    if (!res.ok) {
      setError(res.error ?? 'Verification failed')
      return
    }

    login(res.token, res.user)
    const role = res.user.role
    setWelcome(WELCOME[role] ?? WELCOME.CUSTOMER)
    setTimeout(() => {
      router.push(REDIRECT[role] ?? '/')
      router.refresh()
    }, 800)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-between bg-white p-6 font-sans">
      <div className="space-y-2 pt-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-3xl font-black text-white shadow-xl shadow-orange-100">
          R
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-gray-900">Welcome to Rabbit</h1>
        <p className="text-xs font-medium text-gray-500">
          Hyperlocal kiranas, fish, and shops delivered in minutes
        </p>
      </div>

      {welcome && (
        <p className="rounded-xl bg-green-50 py-3 text-center text-sm font-bold text-green-700">
          {welcome}
        </p>
      )}

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {step === 1 ? (
          <form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-gray-400">
                Enter Mobile Number
              </label>
              <div className="relative flex items-center">
                <Smartphone className="absolute left-4 h-4 w-4 text-gray-400" />
                <span className="absolute left-10 text-sm font-bold text-gray-500">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pl-20 pr-4 text-sm font-bold text-gray-800 transition focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={phone.length < 10 || loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-100 transition hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Get OTP Verification <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void handleVerifyOtp(e)} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Enter OTP Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[10px] font-bold text-orange-600 hover:underline"
                >
                  Change Number
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="text-md w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-center font-black tracking-widest text-gray-800 transition focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
              {devCode && (
                <p className="mt-2 text-center text-[11px] font-medium text-amber-700">
                  Dev OTP: <strong>{devCode}</strong>
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={otp.length < 4 || loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify & Login <Zap className="h-4 w-4 fill-current text-amber-400" />
            </button>
          </form>
        )}

        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>

      <div className="text-center text-[10px] font-medium text-gray-400">
        By signing in, you agree to Rabbit&apos;s Terms of Service and Privacy Policy.
      </div>
    </div>
  )
}
