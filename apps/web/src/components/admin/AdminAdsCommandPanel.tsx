'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarClock,
  CreditCard,
  Loader2,
  MapPin,
  MousePointerClick,
  Plus,
  Power,
  Sparkles,
  Target,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import type { AdPlacement } from '@rabbit/database'
import { FileUploader } from '@/components/ui/file-uploader'
import { cn } from '@/lib/utils'
import {
  computeAdCtr,
  getAdLifecycleStatus,
  type AdRecord,
  type AdLifecycleStatus,
} from '@/lib/ad-utils'

const PLACEMENTS: AdPlacement[] = [
  'HOME_BANNER',
  'HOME_STRIP',
  'SHOP_PAGE',
  'CART_PAGE',
  'CHECKOUT_PAGE',
]

const SEGMENTS = [
  { id: 'NEW_USERS', label: 'New users' },
  { id: 'RETURNING', label: 'Returning customers' },
  { id: 'VIP', label: 'VIP / high LTV' },
  { id: 'INACTIVE', label: 'Re-activation cohort' },
]

const STATUS_STYLES: Record<
  AdLifecycleStatus,
  { label: string; className: string; dot: string }
> = {
  live: {
    label: 'Live',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-sky-50 text-sky-700 ring-sky-200/60',
    dot: 'bg-sky-500',
  },
  expired: {
    label: 'Expired',
    className: 'bg-slate-100 text-slate-500 ring-slate-200/60',
    dot: 'bg-slate-400',
  },
  inactive: {
    label: 'Paused',
    className: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    dot: 'bg-amber-500',
  },
}

type ShopOption = { id: string; name: string; vendorId?: string | null }

type AdAnalytics = {
  liveCampaigns: number
  totalImpressions: number
  totalClicks: number
  totalUniqueClicks: number
  ctr: number
  uniqueCtr: number
}

type SubscriptionPlan = {
  id: string
  merchantId: string
  shopId: string | null
  planType: string
  startDate: string
  endDate: string
  tierLevel: number
  pricePaid: number
  status: string
  settledAt: string | null
  settlementMethod: string | null
  merchant: { businessName: string }
  shop: { id: string; name: string; isActive: boolean } | null
}

type VendorOption = { id: string; businessName: string; shopId?: string }

export function AdminAdsCommandPanel() {
  const [ads, setAds] = useState<AdRecord[]>([])
  const [shops, setShops] = useState<ShopOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionPlan[]>([])
  const [analytics, setAnalytics] = useState<AdAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    imageUrl: null as string | null,
    linkUrl: '',
    placement: 'HOME_BANNER' as AdPlacement,
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '23:59',
    targetZones: '',
    targetSegments: [] as string[],
    targetShopIds: [] as string[],
  })

  const [subForm, setSubForm] = useState({
    merchantId: '',
    shopId: '',
    planType: 'MONTHLY' as 'WEEKLY' | 'MONTHLY' | 'YEARLY',
    tierLevel: 1,
    pricePaid: 999,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [adsRes, shopsRes, analyticsRes, subsRes, vendorsRes] = await Promise.all([
        fetch('/api/admin/ads'),
        fetch('/api/admin/shops'),
        fetch('/api/admin/ads/analytics'),
        fetch('/api/admin/ad-subscriptions'),
        fetch('/api/admin/vendors'),
      ])
      const adsJson = await adsRes.json()
      const shopsJson = await shopsRes.json()
      const analyticsJson = await analyticsRes.json()
      const subsJson = await subsRes.json()
      const vendorsJson = await vendorsRes.json()
      if (adsJson.success) setAds(adsJson.data ?? [])
      if (analyticsJson.success) setAnalytics(analyticsJson.data)
      if (subsJson.success) setSubscriptions(subsJson.data ?? [])
      if (shopsJson.success) {
        setShops(
          (shopsJson.data ?? []).map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          })),
        )
      }
      if (vendorsJson.success) {
        setVendors(vendorsJson.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    if (analytics) {
      return {
        impressions: analytics.totalImpressions,
        clicks: analytics.totalClicks,
        uniqueClicks: analytics.totalUniqueClicks,
        ctr: analytics.ctr,
        uniqueCtr: analytics.uniqueCtr,
        live: analytics.liveCampaigns,
      }
    }
    const impressions = ads.reduce((s, a) => s + a.impressions, 0)
    const clicks = ads.reduce((s, a) => s + a.clicks, 0)
    const uniqueClicks = ads.reduce((s, a) => s + (a.uniqueClicks ?? 0), 0)
    return {
      impressions,
      clicks,
      uniqueClicks,
      ctr: computeAdCtr(impressions, clicks),
      uniqueCtr: computeAdCtr(impressions, uniqueClicks),
      live: ads.filter((a) => getAdLifecycleStatus(a) === 'live').length,
    }
  }, [ads, analytics])

  const resetForm = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    setForm({
      title: '',
      imageUrl: null,
      linkUrl: '',
      placement: 'HOME_BANNER',
      startDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      startTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      endDate: '',
      endTime: '23:59',
      targetZones: '',
      targetSegments: [],
      targetShopIds: [],
    })
  }

  const createAd = async () => {
    if (!form.title.trim() || !form.imageUrl) {
      setError('Title and banner image are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const startIso = new Date(`${form.startDate}T${form.startTime}`).toISOString()
      const endIso =
        form.endDate.trim() !== ''
          ? new Date(`${form.endDate}T${form.endTime}`).toISOString()
          : null

      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || undefined,
          placement: form.placement,
          startDate: startIso,
          endDate: endIso,
          targetZones: form.targetZones
            .split(',')
            .map((z) => z.trim())
            .filter(Boolean),
          targetSegments: form.targetSegments,
          targetShopIds: form.targetShopIds,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Create failed')
      setModalOpen(false)
      resetForm()
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleAdStatus = async (ad: AdRecord) => {
    setTogglingId(ad.id)
    try {
      const res = await fetch(`/api/ads/${ad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ad.isActive }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Toggle failed')
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed')
    } finally {
      setTogglingId(null)
    }
  }

  const settlePlan = async (
    planId: string,
    method: 'EXTERNAL_PAYMENT' | 'PAYOUT_DEDUCTION',
  ) => {
    setSettlingId(planId)
    setError(null)
    try {
      const ref =
        method === 'EXTERNAL_PAYMENT'
          ? prompt('Payment reference (txn ID / receipt):') ?? undefined
          : undefined
      const res = await fetch(`/api/admin/ad-subscriptions/${planId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementMethod: method, settlementRef: ref }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Settlement failed')
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Settlement failed')
    } finally {
      setSettlingId(null)
    }
  }

  const createSubscription = async () => {
    if (!subForm.merchantId) {
      setError('Select a merchant')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ad-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subForm),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Create failed')
      setSubModalOpen(false)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-9 w-9 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.45)]">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
              Campaign command
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white antialiased">
              Ads & Promotions Hub
            </h2>
            <p className="mt-1 max-w-lg text-sm font-medium text-slate-400">
              Enterprise banner orchestration with scheduling, geo-targeting, and live performance telemetry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm()
              setModalOpen(true)
            }}
            className="flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Create campaign
          </button>
        </div>
      </div>

      {/* Analytics strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          icon={Sparkles}
          label="Live campaigns"
          value={String(stats.live)}
          accent="text-orange-500"
        />
        <MetricCard
          icon={BarChart3}
          label="Impressions served"
          value={stats.impressions.toLocaleString('en-IN')}
        />
        <MetricCard
          icon={MousePointerClick}
          label="Total ad clicks"
          value={stats.clicks.toLocaleString('en-IN')}
        />
        <MetricCard
          icon={Target}
          label="Unique clicks"
          value={stats.uniqueClicks.toLocaleString('en-IN')}
          accent="text-sky-600"
        />
        <MetricCard
          icon={Zap}
          label="CTR"
          value={`${stats.ctr}%`}
          sub={`Unique ${stats.uniqueCtr}%`}
          accent="text-emerald-600"
        />
      </div>

      {/* Ad Status Toggle Grid */}
      {ads.length > 0 && (
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Operational grid
              </p>
              <h3 className="font-black text-slate-900">Ad status toggle matrix</h3>
            </div>
            <button
              type="button"
              onClick={() => setSubModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white"
            >
              <CreditCard className="h-3.5 w-3.5" />
              New subscription
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Placement</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Impr.</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                  <th className="px-4 py-3 text-center">Toggle</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => {
                  const status = getAdLifecycleStatus(ad)
                  const badge = STATUS_STYLES[status]
                  const ctr = computeAdCtr(ad.impressions, ad.clicks)
                  return (
                    <tr key={ad.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{ad.title}</p>
                        {ad.shop && (
                          <p className="text-[10px] font-medium text-slate-400">{ad.shop.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                        {ad.placement.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1',
                            badge.className,
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', badge.dot)} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">
                        {ad.impressions.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">
                        {ad.clicks.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-black text-emerald-600">
                        {ctr}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={togglingId === ad.id}
                          onClick={() => void toggleAdStatus(ad)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition',
                            ad.isActive
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-200',
                          )}
                        >
                          {togglingId === ad.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Power className="h-3 w-3" />
                          )}
                          {ad.isActive ? 'On' : 'Off'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Subscription plans ledger */}
      {subscriptions.length > 0 && (
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Monetization ledger
            </p>
            <h3 className="font-black text-slate-900">Ad subscription plans</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {subscriptions.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {plan.merchant.businessName}
                    {plan.shop ? ` · ${plan.shop.name}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {plan.planType} · Tier {plan.tierLevel} · ₹{plan.pricePaid.toLocaleString('en-IN')}
                    {' · '}
                    {new Date(plan.startDate).toLocaleDateString('en-IN')} →{' '}
                    {new Date(plan.endDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1',
                      plan.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : plan.status === 'PAUSED'
                          ? 'bg-amber-50 text-amber-700 ring-amber-200'
                          : 'bg-slate-100 text-slate-500 ring-slate-200',
                    )}
                  >
                    {plan.status}
                    {plan.status === 'ACTIVE' && ' · +50 search boost'}
                  </span>
                  {!plan.settledAt && (
                    <>
                      <button
                        type="button"
                        disabled={settlingId === plan.id}
                        onClick={() => void settlePlan(plan.id, 'EXTERNAL_PAYMENT')}
                        className="flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase text-sky-700 ring-1 ring-sky-200"
                      >
                        <CreditCard className="h-3 w-3" />
                        External pay
                      </button>
                      <button
                        type="button"
                        disabled={settlingId === plan.id}
                        onClick={() => void settlePlan(plan.id, 'PAYOUT_DEDUCTION')}
                        className="flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase text-violet-700 ring-1 ring-violet-200"
                      >
                        <Wallet className="h-3 w-3" />
                        Deduct payout
                      </button>
                    </>
                  )}
                  {plan.settledAt && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Settled via {plan.settlementMethod?.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Campaign grid */}
      {ads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 py-20 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">No campaigns yet — launch your first banner.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ads.map((ad) => {
            const status = getAdLifecycleStatus(ad)
            const badge = STATUS_STYLES[status]
            const ctr = computeAdCtr(ad.impressions, ad.clicks)
            return (
              <article
                key={ad.id}
                className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
              >
                <div className="relative aspect-[2.2/1] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  <span
                    className={cn(
                      'absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 backdrop-blur-sm',
                      badge.className,
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', badge.dot)} />
                    {badge.label}
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="font-bold tracking-tight text-slate-900 antialiased">{ad.title}</h3>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {ad.placement.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50/80 p-2 ring-1 ring-slate-100">
                    <MiniStat label="Views" value={String(ad.impressions)} />
                    <MiniStat label="Clicks" value={String(ad.clicks)} />
                    <MiniStat label="Unique" value={String(ad.uniqueClicks ?? 0)} />
                    <MiniStat label="CTR" value={`${ctr}%`} highlight />
                  </div>
                  <p className="text-[10px] font-medium text-slate-400">
                    {new Date(ad.startDate).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    {ad.endDate
                      ? ` → ${new Date(ad.endDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
                      : ' · No expiry'}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-500">New campaign</p>
                <h3 className="font-black text-slate-900">Create promotional banner</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <FileUploader
                value={form.imageUrl}
                onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                label="Banner creative"
                aspect="banner"
              />

              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  placeholder="Monsoon mega sale"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Deep link (optional)
                </span>
                <input
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-orange-400 focus:outline-none"
                  placeholder="/shops or https://…"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Placement</span>
                <select
                  value={form.placement}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, placement: e.target.value as AdPlacement }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p} value={p}>
                      {p.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <legend className="flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Ad scheduling
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Go live (date)
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Time
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Expires (date)
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Time
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <legend className="flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Hyperlocal targeting
                </legend>
                <label className="block text-xs font-semibold text-slate-600">
                  Delivery zones (comma-separated pincodes / areas)
                  <input
                    value={form.targetZones}
                    onChange={(e) => setForm((f) => ({ ...f, targetZones: e.target.value }))}
                    placeholder="400001, Andheri West, Bandra"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <Users className="h-3.5 w-3.5" />
                    Customer segments
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SEGMENTS.map((seg) => {
                      const active = form.targetSegments.includes(seg.id)
                      return (
                        <button
                          key={seg.id}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              targetSegments: active
                                ? f.targetSegments.filter((s) => s !== seg.id)
                                : [...f.targetSegments, seg.id],
                            }))
                          }
                          className={cn(
                            'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 transition',
                            active
                              ? 'bg-slate-900 text-white ring-slate-900'
                              : 'bg-white text-slate-600 ring-slate-200 hover:ring-orange-300',
                          )}
                        >
                          {seg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {shops.length > 0 && (
                  <label className="block text-xs font-semibold text-slate-600">
                    Storefront scope (hold Ctrl/Cmd for multi)
                    <select
                      multiple
                      value={form.targetShopIds}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          targetShopIds: Array.from(e.target.selectedOptions, (o) => o.value),
                        }))
                      }
                      className="mt-1 h-24 w-full rounded-lg border px-2 py-2 text-sm"
                    >
                      {shops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </fieldset>

              {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            </div>

            <div className="border-t border-slate-100 p-5">
              <button
                type="button"
                disabled={saving || !form.imageUrl}
                onClick={() => void createAd()}
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg disabled:opacity-50"
              >
                {saving ? 'Publishing…' : 'Publish campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {subModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black text-slate-900">Ad subscription plan</h3>
              <button type="button" onClick={() => setSubModalOpen(false)} className="p-2 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                Merchant
                <select
                  value={subForm.merchantId}
                  onChange={(e) => {
                    const v = vendors.find((x) => x.id === e.target.value)
                    setSubForm((f) => ({
                      ...f,
                      merchantId: e.target.value,
                      shopId: v?.shopId ?? '',
                    }))
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Select merchant…</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Store (optional)
                <select
                  value={subForm.shopId}
                  onChange={(e) => setSubForm((f) => ({ ...f, shopId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Platform-wide</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Plan type
                <select
                  value={subForm.planType}
                  onChange={(e) =>
                    setSubForm((f) => ({
                      ...f,
                      planType: e.target.value as 'WEEKLY' | 'MONTHLY' | 'YEARLY',
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-slate-600">
                  Tier level
                  <input
                    type="number"
                    min={1}
                    value={subForm.tierLevel}
                    onChange={(e) =>
                      setSubForm((f) => ({ ...f, tierLevel: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Price (₹)
                  <input
                    type="number"
                    min={0}
                    value={subForm.pricePaid}
                    onChange={(e) =>
                      setSubForm((f) => ({ ...f, pricePaid: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                  />
                </label>
              </div>
              {error && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => void createSubscription()}
                className="w-full rounded-2xl bg-orange-500 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Activate plan (+50 search boost)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Sparkles
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      </div>
      <p className={cn('mt-3 text-2xl font-black tracking-tight antialiased', accent ?? 'text-slate-900')}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{sub}</p>}
    </div>
  )
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p
        className={cn(
          'text-sm font-black tabular-nums',
          highlight ? 'text-emerald-600' : 'text-slate-800',
        )}
      >
        {value}
      </p>
    </div>
  )
}
