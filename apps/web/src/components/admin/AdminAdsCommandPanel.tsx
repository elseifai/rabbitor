'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarClock,
  Loader2,
  MapPin,
  MousePointerClick,
  Plus,
  Sparkles,
  Target,
  Users,
  X,
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

type ShopOption = { id: string; name: string }

export function AdminAdsCommandPanel() {
  const [ads, setAds] = useState<AdRecord[]>([])
  const [shops, setShops] = useState<ShopOption[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [adsRes, shopsRes] = await Promise.all([
        fetch('/api/admin/ads'),
        fetch('/api/admin/shops'),
      ])
      const adsJson = await adsRes.json()
      const shopsJson = await shopsRes.json()
      if (adsJson.success) setAds(adsJson.data ?? [])
      if (shopsJson.success) {
        setShops(
          (shopsJson.data ?? []).map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          })),
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const impressions = ads.reduce((s, a) => s + a.impressions, 0)
    const clicks = ads.reduce((s, a) => s + a.clicks, 0)
    return {
      impressions,
      clicks,
      ctr: computeAdCtr(impressions, clicks),
      live: ads.filter((a) => getAdLifecycleStatus(a) === 'live').length,
    }
  }, [ads])

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Sparkles}
          label="Live campaigns"
          value={String(stats.live)}
          accent="text-orange-500"
        />
        <MetricCard
          icon={BarChart3}
          label="Total impressions"
          value={stats.impressions.toLocaleString('en-IN')}
        />
        <MetricCard
          icon={MousePointerClick}
          label="Total clicks"
          value={stats.clicks.toLocaleString('en-IN')}
        />
        <MetricCard
          icon={Target}
          label="Platform CTR"
          value={`${stats.ctr}%`}
          accent="text-emerald-600"
        />
      </div>

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
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50/80 p-2 ring-1 ring-slate-100">
                    <MiniStat label="Views" value={String(ad.impressions)} />
                    <MiniStat label="Clicks" value={String(ad.clicks)} />
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
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Sparkles
  label: string
  value: string
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
