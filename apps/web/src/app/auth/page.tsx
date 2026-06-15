'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction } from '@/actions/auth'
import { DevRoleLoginPanel } from '@/components/auth/DevRoleLoginPanel'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { AuthRolePicker } from '@/components/auth/AuthRolePicker'
import { isDevSandboxClient } from '@/lib/dev-auth'
import {
  getAuthRoleOption,
  parseAuthRoleParam,
  type AuthRoleId,
  type AuthRoleOption,
} from '@/lib/auth-roles'
import { getOnboardingStatusAction } from '@/actions/onboarding'
import { defaultDashboardForRole, postSignInDestination, signInPortalMatches } from '@/lib/auth-routing'
import { useAuth } from '@/context/AuthContext'

const RESEND_SECONDS = 60

async function resolveDestination(
  userRole: 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN',
  requestedRole: 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN',
  returnTo: string,
  selectedRedirect: string,
) {
  if (returnTo !== '/') return returnTo
  const onboarding = await getOnboardingStatusAction()
  if (onboarding?.nextPath) return onboarding.nextPath
  return postSignInDestination(userRole, requestedRole, returnTo, selectedRedirect)
}

// GOOGLE MAPS & AUTH ACTIVATION — production Google-first auth with email OTP fallback
export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const sandbox = isDevSandboxClient()
  const returnTo = searchParams.get('redirect') ?? '/'
  const oauthError = searchParams.get('error')
  const roleParam = searchParams.get('role')

  const [selectedRoleId, setSelectedRoleId] = useState<AuthRoleId>(() =>
    parseAuthRoleParam(roleParam),
  )
  const selectedRole = getAuthRoleOption(selectedRoleId)
  const ssoRedirect = returnTo !== '/' ? returnTo : selectedRole.redirect

  const [showDevLogin, setShowDevLogin] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(oauthError)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setSelectedRoleId(parseAuthRoleParam(roleParam))
  }, [roleParam])

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
    const res = await requestEmailOtpAction(email, selectedRole.role)
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
    const res = await verifyEmailOtpAction(email, otp, selectedRole.role)
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Invalid code. Please try again.')
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
      return
    }
    if (selectedRole.role !== 'CUSTOMER' && !signInPortalMatches(res.user.role, selectedRole.role)) {
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
    const destination = await resolveDestination(
      res.user.role as 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN',
      selectedRole.role,
      returnTo,
      selectedRole.redirect,
    )
    router.push(destination)
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
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
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
    const res = await requestEmailOtpAction(email, selectedRole.role)
    setLoading(false)
    if (!res.ok) { setError(res.error); return }
    setDevCode(res.devCode ?? null)
    setCountdown(RESEND_SECONDS)
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  if (sandbox && showDevLogin) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={() => setShowDevLogin(false)}
            className="text-xs font-bold text-orange-500"
          >
            ← Back
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg font-black text-white">
            🐰
          </div>
          <span className="text-lg font-black text-gray-900">Dev Sandbox</span>
        </div>
        <DevRoleLoginPanel
          mode="page"
          resolveRedirect={(account, user) => {
            if (returnTo && user.role === 'CUSTOMER') return returnTo
            return defaultDashboardForRole(user.role) || account.redirect
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col bg-white">
      <div className="flex items-center gap-3 p-4">
        {step === 2 && (
          <button
            type="button"
            onClick={() => { setStep(1); setDigits(['', '', '', '', '', '']); setError(null) }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-100"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg font-black text-white">
          🐰
        </div>
        <span className="text-lg font-black text-gray-900">Rabbit</span>
      </div>

      <div className="flex flex-1 flex-col px-6 pt-6">
        {step === 1 ? (
          <>
            <h1 className="text-2xl font-black text-gray-900">Sign in to Rabbit</h1>
            <p className="mt-1 text-sm text-gray-500">
              Choose how you&apos;ll use Rabbit, then sign in with Google or email
            </p>

            <AuthRolePicker
              className="mt-6"
              value={selectedRoleId}
              onChange={(id: AuthRoleId, _option: AuthRoleOption) => setSelectedRoleId(id)}
            />

            <div className="mt-6">
              <GoogleSignInButton role={selectedRole.role} redirect={ssoRedirect} />
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
              <span className="h-px flex-1 bg-orange-100" />
              OR EMAIL OTP
              <span className="h-px flex-1 bg-orange-100" />
            </div>

            <form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4">
              <div className="flex items-center overflow-hidden rounded-xl border-2 border-orange-100 bg-orange-50/20 focus-within:border-orange-400 focus-within:bg-white">
                <span className="flex h-14 items-center border-r border-orange-100 bg-white px-4">
                  <Mail className="h-4 w-4 text-gray-500" />
                </span>
                <input
                  type="email"
                  required
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
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-base font-bold text-white shadow-lg shadow-orange-100 transition active:scale-95 disabled:opacity-40"
              >
                {loading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <>Get code <ArrowRight className="h-5 w-5" /></>
                }
              </button>
            </form>

            {sandbox && (
              <button
                type="button"
                onClick={() => setShowDevLogin(true)}
                className="mt-6 w-full text-center text-xs font-semibold text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
              >
                Developer sandbox login
              </button>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-gray-900">Enter the code</h1>
            <p className="mt-1 text-sm text-gray-500">
              We sent a 6-digit code to{' '}
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
                  maxLength={6}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`h-14 w-full rounded-xl border-2 text-center text-xl font-black text-gray-900 outline-none transition ${
                    d
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-orange-100 bg-orange-50/20 focus:border-orange-400 focus:bg-white'
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
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-base font-bold text-white shadow-lg shadow-orange-100 transition active:scale-95 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Continue'}
            </button>

            <div className="mt-4 text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">
                  Resend code in{' '}
                  <span className="font-bold text-orange-500">0:{countdown.toString().padStart(2, '0')}</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  className="text-sm font-bold text-orange-500 underline"
                >
                  Resend code
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <p className="px-6 py-4 text-center text-[11px] text-gray-400">
        By continuing, you agree to Rabbit&apos;s Terms of Service &amp; Privacy Policy
      </p>
    </div>
  )
}
