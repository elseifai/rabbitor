'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { RoleGate } from '@/components/auth/RoleGate'
import { AdPlansDeck } from '@/components/merchant/ad-plans-deck'
import { authFetch } from '@/lib/session'
import { formatCurrency } from '@/lib/utils'
import {
  CheckCircle2,
  Clock,
  Loader2,
  Megaphone,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'

type AdPlanRecord = {
  id: string
  planType: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  startDate: string
  endDate: string
  pricePaid: number
  tierLevel: number
  isLive: boolean
  daysRemaining: number
}

const PLAN_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly Sprint',
  MONTHLY: 'Monthly Growth',
  YEARLY: 'Yearly Dominance',
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  EXPIRED: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
}

function ActiveBoostBanner({ plan }: { plan: AdPlanRecord }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 shadow-xl">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
            <Zap className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Search Boost Live
            </p>
            <h2 className="mt-0.5 text-xl font-black tracking-tight text-white">
              {PLAN_LABELS[plan.planType]} Active
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-400">
              +50 search weight applied — your store ranks above unsponsored listings
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-bold text-white">
              {plan.daysRemaining} day{plan.daysRemaining !== 1 ? 's' : ''} remaining
            </span>
          </div>
          <div className="rounded-2xl bg-emerald-500/20 px-4 py-2 text-center ring-1 ring-emerald-400/30">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
              Tier {plan.tierLevel} Campaign
            </p>
            <p className="text-lg font-black text-white">{formatCurrency(plan.pricePaid)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white/5 px-3 py-2.5 text-center ring-1 ring-white/10">
          <TrendingUp className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Ranking Boost
          </p>
          <p className="text-sm font-black text-white">+50 pts</p>
        </div>
        <div className="rounded-2xl bg-white/5 px-3 py-2.5 text-center ring-1 ring-white/10">
          <Sparkles className="mx-auto mb-1 h-4 w-4 text-amber-400" />
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Placement
          </p>
          <p className="text-sm font-black text-white">Priority</p>
        </div>
        <div className="rounded-2xl bg-white/5 px-3 py-2.5 text-center ring-1 ring-white/10">
          <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Kill Switch
          </p>
          <p className="text-sm font-black text-white">Protected</p>
        </div>
      </div>
    </div>
  )
}

function SubscriptionHistory({ plans }: { plans: AdPlanRecord[] }) {
  if (plans.length === 0) return null
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        Subscription History
      </h3>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {plans.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Megaphone className="h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-800">{PLAN_LABELS[p.planType]}</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(p.startDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  →{' '}
                  {new Date(p.endDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-slate-700">{formatCurrency(p.pricePaid)}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[p.status]}`}
              >
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ManageAdsInner() {
  const searchParams = useSearchParams()
  const justActivated = searchParams.get('activated')

  const [plans, setPlans] = useState<AdPlanRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadPlans = useCallback(async () => {
    try {
      const res = await authFetch('/api/merchant/ad-subscriptions')
      const json = (await res.json()) as { success: boolean; data: AdPlanRecord[] }
      if (json.success) setPlans(json.data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const activeLive = plans.find((p) => p.isLive)

  return (
    <div className="space-y-8">
      {justActivated && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {PLAN_LABELS[justActivated] ?? justActivated} plan activated — your search boost is now
          live across customer discovery feeds.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
        </div>
      ) : (
        <>
          {activeLive && <ActiveBoostBanner plan={activeLive} />}

          {!activeLive && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
              <Megaphone className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No active campaign</p>
              <p className="mt-1 text-xs text-slate-400">
                Select a plan below to start boosting your store visibility.
              </p>
            </div>
          )}

          <SubscriptionHistory plans={plans} />
        </>
      )}

      <AdPlansDeck />
    </div>
  )
}

export default function ManageAdsPage() {
  return (
    <RoleGate role="VENDOR" redirectTo="/merchant/login">
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
          </div>
        }
      >
        <ManageAdsInner />
      </Suspense>
    </RoleGate>
  )
}
