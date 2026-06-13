'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction } from '@/actions/auth'
import { DevRoleLoginPanel } from '@/components/auth/DevRoleLoginPanel'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { isDevSandboxClient } from '@/lib/dev-auth'
import { useAuth } from '@/context/AuthContext'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const redirect = searchParams.get('redirect') ?? '/'
  const sandbox = isDevSandboxClient()

  const [showEmailLogin, setShowEmailLogin] = useState(false)
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
    const res = await requestEmailOtpAction(email, 'CUSTOMER')
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
    const res = await verifyEmailOtpAction(email, otp, 'CUSTOMER')
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Verification failed')
      return
    }
    login(res.token, res.user)
    router.push(redirect)
    router.refresh()
  }

  // DEV ONLY BYPASS — role picker is the primary entry in sandbox environments.
  if (sandbox && !showEmailLogin && step === 'email') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="mx-auto max-w-lg px-4 pt-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
        <DevRoleLoginPanel mode="page" />
        <div className="mx-auto max-w-lg px-4 pb-10 text-center">
          <button
            type="button"
            onClick={() => setShowEmailLogin(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Use email / Google sign-in instead
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      {sandbox && (
        <button
          type="button"
          onClick={() => {
            setShowEmailLogin(false)
            setStep('email')
            setError(null)
          }}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#FF6B35]"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Back to role quick login
        </button>
      )}

      <h1 className="mt-6 font-display text-2xl font-bold">Sign in to Rabbit</h1>
      <p className="mt-1 text-sm text-gray-500">
        Use your email or continue with Google.
      </p>

      <GoogleSignInButton redirect={redirect} className="mt-6" />

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        OR
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      {step === 'email' ? (
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-lg"
            />
          </div>
          <button
            type="button"
            disabled={!emailValid || loading}
            onClick={sendOtp}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send code
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            We sent a 6-digit code and a sign-in link to {email}
            {devCode && (
              <span className="mt-1 block rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                Dev code: <strong>{devCode}</strong>
              </span>
            )}
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
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
            onClick={() => setStep('email')}
            className="w-full text-sm text-gray-500"
          >
            Use a different email
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  )
}
