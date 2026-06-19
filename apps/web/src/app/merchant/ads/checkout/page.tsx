'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { RoleGate } from '@/components/auth/RoleGate'
import { getMerchantShopAction } from '@/actions/merchant'
import { cn, formatCurrency } from '@/lib/utils'
import { loadRazorpayScript } from '@/lib/razorpay'
import { authFetch } from '@/lib/session'

const PLAN_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly Sprint',
  MONTHLY: 'Monthly Growth',
  YEARLY: 'Yearly Dominance',
}

function MerchantAdCheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const plan = params.get('plan') ?? 'MONTHLY'
  const amount = Number(params.get('amount') ?? 0)
  const shopIdParam = params.get('shopId') ?? ''
  const tier = params.get('tier') ?? '1'

  const [validating, setValidating] = useState(true)
  const [shopId, setShopId] = useState(shopIdParam)
  const [shopName, setShopName] = useState('')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getMerchantShopAction().then((shop) => {
      if (!shop) {
        setError('Store not found. Complete onboarding first.')
        setValidating(false)
        return
      }
      if (shopIdParam && shop.id !== shopIdParam) {
        setError('Invalid store context for this merchant session.')
        setValidating(false)
        return
      }
      setShopId(shop.id)
      setShopName(shop.name)
      setValidating(false)
    })
  }, [shopIdParam])

  const handlePayment = useCallback(async () => {
    if (!shopId || amount <= 0) return
    setPaying(true)
    setError(null)

    try {
      const res = await authFetch('/api/merchant/ad-subscriptions/checkout-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: plan,
          amount,
          shopId,
          tierLevel: Number(tier),
        }),
      })
      const json = await res.json()

      if (!json.success) {
        if (json.fallback) {
          router.push(`/merchant/ads?activated=${plan}`)
          return
        }
        throw new Error(json.error ?? 'Payment setup failed')
      }

      const loaded = await loadRazorpayScript()
      if (!loaded || !json.data?.razorpayOrderId) {
        router.push(`/merchant/ads?activated=${plan}&pending=1`)
        return
      }

      const rzp = new window.Razorpay({
        key: json.data.razorpayKey,
        amount: json.data.amountPaise,
        currency: 'INR',
        name: 'Rabbit Promotions',
        description: `${PLAN_LABELS[plan] ?? plan} — ${shopName}`,
        order_id: json.data.razorpayOrderId,
        handler: async (response) => {
          await authFetch('/api/merchant/ad-subscriptions/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planType: plan,
              shopId,
              tierLevel: Number(tier),
              pricePaid: amount,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            }),
          })
          router.push(`/merchant/ads?activated=${plan}`)
        },
        theme: { color: '#FF6B35' },
        modal: {
          ondismiss: () => setPaying(false),
        },
      })
      rzp.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }, [amount, plan, router, shopId, shopName, tier])

  if (validating) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link
        href="/merchant/ads"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FF6B35]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to plans
      </Link>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-8 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
            Campaign checkout
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight antialiased">
            {PLAN_LABELS[plan] ?? plan}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{shopName}</p>
          <p className="mt-4 text-4xl font-black tracking-tight">{formatCurrency(amount)}</p>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Included</p>
            <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                +50 search weight boost
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Kill-switch auto-pause protection
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 ring-1 ring-amber-100">
            Ad budget is non-refundable once the campaign window begins. Review terms on the plan
            card before proceeding.
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={paying || !!error || !shopId}
            onClick={() => void handlePayment()}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-orange-600 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/30 transition hover:scale-[1.01] disabled:opacity-50',
            )}
          >
            {paying ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            {paying ? 'Opening gateway…' : 'Proceed to payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MerchantAdCheckoutPage() {
  return (
    <RoleGate role="VENDOR" redirectTo="/merchant/login">
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
          </div>
        }
      >
        <MerchantAdCheckoutInner />
      </Suspense>
    </RoleGate>
  )
}
