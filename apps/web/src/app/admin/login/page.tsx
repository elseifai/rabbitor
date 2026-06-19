'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Loader2, Shield } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction } from '@/actions/auth'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { AuthRolePicker } from '@/components/auth/AuthRolePicker'
import { useAuth } from '@/context/AuthContext'
import { getAuthRoleOption, type AuthRoleId } from '@/lib/auth-roles'
import { PartnerPhoneLogin } from '@/components/auth/PartnerPhoneLogin'
import { signInPortalMatches } from '@/lib/auth-routing'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(searchParams.get('error'))
  const [selectedRoleId, setSelectedRoleId] = useState<AuthRoleId>('admin')
  const selectedRole = getAuthRoleOption(selectedRoleId)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const sendOtp = async () => {
    setLoading(true)
    setError(null)
    const res = await requestEmailOtpAction(email, selectedRole.role)
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Failed to send code')
    setStep('otp')
  }

  const verify = async () => {
    setLoading(true)
    setError(null)
    const res = await verifyEmailOtpAction(email, otp, selectedRole.role)
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Invalid code')
    if (!signInPortalMatches(res.user.role, selectedRole.role)) {
      setError(
        selectedRole.role === 'VENDOR'
          ? 'This email is not registered as a merchant.'
          : selectedRole.role === 'RABBITOR'
            ? 'This email is not registered as a delivery partner.'
            : 'This email is not registered as admin.',
      )
      return
    }
    login(res.token, res.user)
    router.push(selectedRole.redirect)
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
          <p className="text-sm text-slate-500">Sign in with your registered admin email or phone</p>
        </div>
      </div>

      <AuthRolePicker
        className="mb-6"
        compact
        value={selectedRoleId}
        onChange={(id) => setSelectedRoleId(id)}
      />

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
          <GoogleSignInButton
            role="ADMIN"
            redirect="/admin"
            className="h-auto border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          />

          <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-100" />
            OR PHONE OTP
            <span className="h-px flex-1 bg-slate-100" />
          </div>

          <PartnerPhoneLogin role="ADMIN" redirectTo="/admin" />
        </div>
      ) : (
        <div className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Enter the 6-digit code sent to <span className="font-bold">{email}</span>
          </p>
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
