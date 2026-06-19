'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Phone } from 'lucide-react'
import { requestOtpAction, verifyOtpAction } from '@/actions/auth'
import { useAuth } from '@/context/AuthContext'
import { isDevSandboxClient } from '@/lib/dev-auth'
import { signInPortalMatches } from '@/lib/auth-routing'
import type { AuthRole } from '@/lib/auth-roles'

type VerifiedUser = {
  id: string
  name: string
  role: string
  phone?: string | null
  email?: string | null
}

const ROLE_COPY: Record<
  AuthRole,
  { hint: string; mismatch: string }
> = {
  CUSTOMER: {
    hint: 'Enter your mobile number. We will send a one-time code via SMS.',
    mismatch: 'This phone is not registered for this account type.',
  },
  VENDOR: {
    hint: 'Use the mobile number linked to your merchant account.',
    mismatch: 'This phone is not registered as a merchant.',
  },
  RABBITOR: {
    hint: 'Use the mobile number linked to your delivery partner account.',
    mismatch: 'This phone is not registered as a delivery partner.',
  },
  ADMIN: {
    hint: 'Use the mobile number linked to your admin account.',
    mismatch: 'This phone is not registered as admin.',
  },
}

type PhoneOtpLoginProps = {
  role: AuthRole
  redirectTo?: string
  onVerified?: (result: { token: string; user: VerifiedUser }) => void | Promise<void>
  compact?: boolean
}

export function PhoneOtpLogin({
  role,
  redirectTo = '/',
  onVerified,
  compact = false,
}: PhoneOtpLoginProps) {
  const router = useRouter()
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const digits = phone.replace(/\D/g, '')
  const phoneValid = digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))
  const copy = ROLE_COPY[role]
  const showDevCode = isDevSandboxClient()

  const sendOtp = async () => {
    setLoading(true)
    setError(null)
    const res = await requestOtpAction(phone)
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Could not send OTP. Check your number and try again.')
      return
    }
    setDevCode(res.devCode ?? null)
    setStep('otp')
  }

  const verify = async () => {
    setLoading(true)
    setError(null)
    const res = await verifyOtpAction(phone, otp, role)
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Invalid or expired OTP.')
      return
    }
    if (role !== 'CUSTOMER' && !signInPortalMatches(res.user.role, role)) {
      setError(copy.mismatch)
      return
    }
    login(res.token, res.user)
    if (onVerified) {
      await onVerified({ token: res.token, user: res.user })
      return
    }
    router.push(redirectTo)
    router.refresh()
  }

  const shellClass = compact
    ? 'space-y-3'
    : 'space-y-4 rounded-2xl border border-orange-100 bg-orange-50/30 p-4'

  return (
    <div className={shellClass}>
      {!compact && (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Mobile OTP
          </p>
          <p className="text-[11px] leading-snug text-gray-500">{copy.hint}</p>
        </>
      )}

      {step === 'phone' ? (
        <>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
              +91
            </span>
            <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border-2 border-orange-100 bg-white py-3 pl-11 pr-10 text-base font-bold text-gray-900 outline-none focus:border-orange-400"
            />
          </div>
          <button
            type="button"
            disabled={!phoneValid || loading}
            onClick={() => void sendOtp()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-100 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Enter the 6-digit code sent to{' '}
            <span className="font-bold text-gray-900">{phone}</span>
          </p>
          {showDevCode && devCode && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              Dev code: <strong className="text-lg tracking-widest">{devCode}</strong>
            </div>
          )}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit OTP"
            className="w-full rounded-xl border-2 border-orange-100 bg-white px-4 py-3 text-center text-xl font-black tracking-[0.3em] outline-none focus:border-orange-400"
          />
          <button
            type="button"
            disabled={otp.length !== 6 || loading}
            onClick={() => void verify()}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-100 disabled:opacity-40"
          >
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('phone')
              setOtp('')
              setDevCode(null)
              setError(null)
            }}
            className="w-full text-xs font-bold text-gray-400"
          >
            Change phone number
          </button>
        </>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
      )}
    </div>
  )
}

/** @deprecated Use PhoneOtpLogin */
export function PartnerPhoneLogin(props: PhoneOtpLoginProps) {
  return <PhoneOtpLogin {...props} />
}
