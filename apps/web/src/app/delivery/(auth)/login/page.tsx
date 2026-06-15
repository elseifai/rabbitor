'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail } from 'lucide-react'
import { requestEmailOtpAction, verifyEmailOtpAction } from '@/actions/auth'
import { getRiderProfileStatusAction } from '@/actions/rider-onboarding'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { RiderOnboardingWizard } from '@/components/delivery/RiderOnboardingWizard'
import { useAuth } from '@/context/AuthContext'
import { roleCanAccessPortal, signInPortalMatches } from '@/lib/auth-routing'

type GatewayView = 'loading' | 'login' | 'setup'

export default function DeliveryEnterGatewayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setupMode = searchParams.get('setup') === '1'
  const oauthError = searchParams.get('error')
  const { login, user, isLoggedIn, hydrated } = useAuth()

  const [view, setView] = useState<GatewayView>('loading')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(oauthError)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [initialProfile, setInitialProfile] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    if (!hydrated) return

    if (!isLoggedIn || !user) {
      setView(setupMode ? 'login' : 'login')
      return
    }

    if (!roleCanAccessPortal(user.role, 'RABBITOR')) {
      setView('login')
      setError('This account cannot access the rider portal.')
      return
    }

    void (async () => {
      const res = await getRiderProfileStatusAction()
      if (!res.ok) {
        setError(res.error)
        setView('login')
        return
      }
      if (res.status.isOnboarded) {
        router.replace('/delivery/dashboard')
        return
      }
      setInitialProfile(res.status.profile as Record<string, string> | null)
      setView('setup')
    })()
  }, [hydrated, isLoggedIn, user, router, setupMode])

  const sendOtp = async () => {
    setLoading(true)
    setError(null)
    const res = await requestEmailOtpAction(email, 'RABBITOR')
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Failed to send code')
    setDevCode(res.devCode ?? null)
    setStep('otp')
  }

  const verify = async () => {
    setLoading(true)
    setError(null)
    const res = await verifyEmailOtpAction(email, otp, 'RABBITOR')
    setLoading(false)
    if (!res.ok) return setError(res.error ?? 'Invalid code')
    if (!signInPortalMatches(res.user.role, 'RABBITOR')) {
      setError('This email is not registered as a delivery partner.')
      return
    }
    login(res.token, res.user)
    const profile = await getRiderProfileStatusAction()
    if (profile.ok && profile.status.isOnboarded) {
      router.replace('/delivery/dashboard')
      return
    }
    setView('setup')
  }

  if (!hydrated || view === 'loading') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="mt-3 text-sm text-gray-500">Checking rider session…</p>
      </div>
    )
  }

  if (view === 'setup') {
    return (
      <RiderOnboardingWizard
        initial={initialProfile ?? undefined}
        onComplete={() => router.replace('/delivery/dashboard')}
      />
    )
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="text-2xl font-black text-gray-900">Rider sign in</h1>
      <p className="mt-1 text-sm text-gray-500">
        Sign in to complete your delivery partner profile
      </p>

      <div className="mt-6">
        <GoogleSignInButton
          role="RABBITOR"
          redirect="/delivery/login?setup=1"
          label="Continue with Google"
        />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-orange-100" />
        OR EMAIL OTP
        <span className="h-px flex-1 bg-orange-100" />
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
              className="w-full rounded-xl border-2 border-orange-100 py-3 pl-10 pr-4 outline-none focus:border-orange-400"
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
            Enter the 6-digit code sent to <strong>{email}</strong>
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
            className="w-full rounded-xl border-2 border-orange-100 px-4 py-3 text-center text-2xl tracking-widest outline-none focus:border-orange-400"
          />
          <button
            type="button"
            onClick={() => void verify()}
            disabled={loading || otp.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify & continue
          </button>
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Link href="/" className="mt-8 block text-center text-sm text-gray-500 hover:text-orange-500">
        ← Customer app
      </Link>
    </div>
  )
}
