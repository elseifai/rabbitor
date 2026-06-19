'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, Mail, Phone } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction } from '@/actions/auth'
import { DevRoleLoginPanel } from '@/components/auth/DevRoleLoginPanel'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { PhoneOtpLogin } from '@/components/auth/PhoneOtpLogin'
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

type SignInMethod = 'google' | 'phone' | 'email'

function GoogleTabIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

const SIGN_IN_METHODS: { id: SignInMethod; label: string; icon?: 'google' | 'phone' | 'email' }[] = [
  { id: 'google', label: 'Google', icon: 'google' },
  { id: 'phone', label: 'Mobile', icon: 'phone' },
  { id: 'email', label: 'Email', icon: 'email' },
]

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
  const roleParam = searchParams.get('role')

  const [selectedRoleId, setSelectedRoleId] = useState<AuthRoleId>(() =>
    parseAuthRoleParam(roleParam),
  )
  const selectedRole = getAuthRoleOption(selectedRoleId)
  const ssoRedirect = returnTo !== '/' ? returnTo : selectedRole.redirect

  const [showDevLogin, setShowDevLogin] = useState(false)
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('phone')
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setSelectedRoleId(parseAuthRoleParam(roleParam))
  }, [roleParam])

  useEffect(() => {
    if (!searchParams.get('error')) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('error')
    const q = params.toString()
    router.replace(q ? `/auth?${q}` : '/auth', { scroll: false })
  }, [searchParams, router])

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
              Choose your role, then sign in with Google, mobile OTP, or email
            </p>

            <AuthRolePicker
              className="mt-6"
              value={selectedRoleId}
              onChange={(id: AuthRoleId, _option: AuthRoleOption) => setSelectedRoleId(id)}
            />

            <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl bg-orange-50/60 p-1">
              {SIGN_IN_METHODS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSignInMethod(id)
                    setError(null)
                  }}
                  className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-wide transition ${
                    signInMethod === id
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {icon === 'google' && <GoogleTabIcon />}
                  {icon === 'phone' && <Phone className="h-4 w-4" />}
                  {icon === 'email' && <Mail className="h-4 w-4" />}
                  {label}
                </button>
              ))}
            </div>

            {signInMethod === 'google' && (
              <div className="mt-4">
                <GoogleSignInButton role={selectedRole.role} redirect={ssoRedirect} />
                <p className="mt-3 text-center text-xs text-gray-400">
                  Use your Gmail or Google Workspace account
                </p>
              </div>
            )}

            {signInMethod === 'phone' && (
              <div className="mt-4">
                <PhoneOtpLogin
                  role={selectedRole.role}
                  compact
                  onVerified={async ({ user }) => {
                    const destination = await resolveDestination(
                      user.role as 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN',
                      selectedRole.role,
                      returnTo,
                      selectedRole.redirect,
                    )
                    router.push(destination)
                    router.refresh()
                  }}
                />
              </div>
            )}

            {signInMethod === 'email' && (
              <form onSubmit={(e) => void handleSendOtp(e)} className="mt-4 space-y-4">
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
            )}

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

            {sandbox && devCode && (
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
        By continuing, you agree to Rabbit&apos;s{' '}
        <a href="/terms" className="underline">
          Terms of Service
        </a>{' '}
        &amp;{' '}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
      </p>
    </div>
  )
}
