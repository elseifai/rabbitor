'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Loader2,
  Megaphone,
  Plus,
  Search,
  Settings2,
  X,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import {
  handoverLabel,
  tierMeta,
  type StorePerformanceTier,
} from '@/lib/store-performance'
import { StoreOperationsCommandModal } from '@/components/admin/StoreOperationsCommandModal'

type ShopRow = {
  id: string
  name: string
  storeType: string
  address: string
  isActive: boolean
  pausedUntil: string | null
  liveOrders: number
  dailyRevenue: number
  packingDelayMin: number
  handoverMin: number
  fulfillmentRate: number
  customerFeedbackPositivePercent: number
  activePromotions: number
  performanceTier: StorePerformanceTier
  minOrderValue: number
  packingCharge: number
  deliveryRadiusKm: number
  avgPrepMinutes: number
  openingHours: unknown
}

export function AdminStoresOpsPanel() {
  const [shops, setShops] = useState<ShopRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [drawer, setDrawer] = useState<ShopRow | null>(null)
  const [commandStore, setCommandStore] = useState<ShopRow | null>(null)
  const [pausePrompt, setPausePrompt] = useState<ShopRow | null>(null)
  const [broadcastTarget, setBroadcastTarget] = useState<ShopRow | null>(null)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    minOrderValue: '',
    packingCharge: '',
    deliveryRadiusKm: '',
    avgPrepMinutes: '',
    openTime: '08:00',
    closeTime: '22:00',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stores')
      const json = await res.json()
      if (json.success) setShops(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = shops.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase()),
  )

  const patchStore = async (
    shop: ShopRow,
    body: Record<string, unknown>,
  ): Promise<boolean> => {
    setToggling(shop.id)
    try {
      const res = await fetch(`/api/admin/stores/${shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        void load()
        return true
      }
      return false
    } finally {
      setToggling(null)
    }
  }

  const onKillSwitchClick = (shop: ShopRow) => {
    if (shop.isActive) {
      setPausePrompt(shop)
    } else {
      void patchStore(shop, { isActive: true })
    }
  }

  const confirmPause = async (mode: 'temporary' | 'permanent') => {
    if (!pausePrompt) return
    const ok = await patchStore(pausePrompt, {
      isActive: false,
      ...(mode === 'temporary' ? { pauseMinutes: 30 } : { permanent: true }),
    })
    if (ok) setPausePrompt(null)
  }

  const sendBroadcast = async () => {
    if (!broadcastTarget || !broadcastMsg.trim()) return
    setBroadcasting(true)
    try {
      const res = await fetch(`/api/admin/stores/${broadcastTarget.id}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMsg.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setBroadcastTarget(null)
        setBroadcastMsg('')
      }
    } finally {
      setBroadcasting(false)
    }
  }

  const openDrawer = (shop: ShopRow) => {
    setDrawer(shop)
    const hours = shop.openingHours as { open?: string; close?: string } | null
    setForm({
      minOrderValue: String(shop.minOrderValue ?? 0),
      packingCharge: String(shop.packingCharge ?? 0),
      deliveryRadiusKm: String(shop.deliveryRadiusKm ?? 3),
      avgPrepMinutes: String(shop.avgPrepMinutes ?? 15),
      openTime: hours?.open ?? '08:00',
      closeTime: hours?.close ?? '22:00',
    })
  }

  const saveDrawer = async () => {
    if (!drawer) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/stores/${drawer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minOrderValue: Number(form.minOrderValue),
          packingCharge: Number(form.packingCharge),
          deliveryRadiusKm: Number(form.deliveryRadiusKm),
          avgPrepMinutes: Number(form.avgPrepMinutes),
          openingHours: { open: form.openTime, close: form.closeTime },
        }),
      })
      const json = await res.json()
      if (json.success) {
        setDrawer(null)
        void load()
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter stores…"
            className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <Link
          href="/admin/new-store"
          className="flex items-center gap-1 rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Add Store
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[1300px] text-left text-sm">
          <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-white">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Handover</th>
              <th className="px-4 py-3">Fulfillment</th>
              <th className="px-4 py-3">Feedback</th>
              <th className="px-4 py-3">Promos</th>
              <th className="px-4 py-3">Live</th>
              <th className="px-4 py-3">Daily GMV</th>
              <th className="px-4 py-3">Pack delay</th>
              <th className="px-4 py-3">Kill switch</th>
              <th className="px-4 py-3">Ops</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((s) => {
              const tier = tierMeta(s.performanceTier)
              const handover = handoverLabel(s.handoverMin)
              return (
                <tr key={s.id} className="hover:bg-orange-50/30">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase ring-1',
                        tier.className,
                      )}
                    >
                      {tier.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setCommandStore(s)}
                      className="group text-left"
                    >
                      <p className="font-bold text-gray-900 underline-offset-2 group-hover:text-[#FF6B35] group-hover:underline">
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.storeType} · {s.address}
                      </p>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-xs font-bold',
                        handover.warn ? 'text-red-600' : 'text-emerald-700',
                      )}
                    >
                      {handover.text}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-lg px-2 py-1 text-xs font-black',
                        s.fulfillmentRate >= 98
                          ? 'bg-emerald-100 text-emerald-700'
                          : s.fulfillmentRate >= 90
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-red-100 text-red-700',
                      )}
                    >
                      {s.fulfillmentRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-lg px-2 py-1 text-xs font-black',
                        s.customerFeedbackPositivePercent >= 90
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                          : s.customerFeedbackPositivePercent >= 75
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-red-50 text-red-700',
                      )}
                    >
                      ⭐ {s.customerFeedbackPositivePercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-violet-700">
                    {s.activePromotions > 0
                      ? `${s.activePromotions} Offer${s.activePromotions > 1 ? 's' : ''} Active`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-lg px-2 py-1 text-xs font-black',
                        s.liveOrders > 0
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {s.liveOrders}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#0C831F]">
                    {formatCurrency(s.dailyRevenue)}
                  </td>
                  <td className="px-4 py-3">
                    {s.packingDelayMin > 0 ? (
                      <span className="animate-pulse rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                        +{s.packingDelayMin}m
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">On time</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={toggling === s.id}
                      onClick={() => onKillSwitchClick(s)}
                      className={cn(
                        'relative h-7 w-14 rounded-full transition',
                        s.isActive ? 'bg-[#0C831F]' : 'bg-gray-300',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                          s.isActive ? 'left-7' : 'left-0.5',
                        )}
                      />
                    </button>
                    <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">
                      {s.isActive
                        ? s.pausedUntil
                          ? 'Paused soon'
                          : 'Open'
                        : s.pausedUntil
                          ? `Until ${new Date(s.pausedUntil).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Closed'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDrawer(s)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:border-orange-300 hover:text-orange-600"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Advanced
                      </button>
                      <button
                        type="button"
                        title="Broadcast warning to merchant portal"
                        onClick={() => {
                          setBroadcastTarget(s)
                          setBroadcastMsg('')
                        }}
                        className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-700 hover:bg-amber-100"
                      >
                        <Megaphone className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <StoreOperationsCommandModal
        storeId={commandStore?.id ?? null}
        storeName={commandStore?.name ?? ''}
        open={!!commandStore}
        onClose={() => setCommandStore(null)}
      />

      {pausePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" />
              <div>
                <h3 className="font-black text-gray-900">Close {pausePrompt.name}?</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a pause type. Temporary pauses auto-resume after 30 minutes for surge
                  management.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                disabled={toggling === pausePrompt.id}
                onClick={() => void confirmPause('temporary')}
                className="rounded-xl bg-amber-500 py-3 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-50"
              >
                Temporary pause (30 min)
              </button>
              <button
                type="button"
                disabled={toggling === pausePrompt.id}
                onClick={() => void confirmPause('permanent')}
                className="rounded-xl border-2 border-red-200 py-3 text-sm font-black text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Permanent manual closure
              </button>
              <button
                type="button"
                onClick={() => setPausePrompt(null)}
                className="py-2 text-sm font-semibold text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {broadcastTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900">Merchant broadcast</h3>
              <button
                type="button"
                onClick={() => setBroadcastTarget(null)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Instant warning to {broadcastTarget.name}&apos;s merchant dashboard (24h visibility).
            </p>
            <textarea
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              rows={4}
              placeholder="e.g. Pack delays detected — prioritize active orders."
              className="mt-4 w-full rounded-xl border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={broadcasting || !broadcastMsg.trim()}
              onClick={() => void sendBroadcast()}
              className="mt-4 w-full rounded-xl bg-[#FF6B35] py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {broadcasting ? 'Sending…' : 'Send broadcast'}
            </button>
          </div>
        </div>
      )}

      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">Store parameters</p>
                <h3 className="font-black text-gray-900">{drawer.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawer(null)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <fieldset className="space-y-2">
                <legend className="text-xs font-black uppercase text-gray-400">Operating hours</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold">
                    Open
                    <input
                      type="time"
                      value={form.openTime}
                      onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Close
                    <input
                      type="time"
                      value={form.closeTime}
                      onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </fieldset>
              <label className="block text-xs font-semibold text-gray-600">
                Minimum order value (₹)
                <input
                  type="number"
                  value={form.minOrderValue}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                Packing charge override (₹)
                <input
                  type="number"
                  value={form.packingCharge}
                  onChange={(e) => setForm((f) => ({ ...f, packingCharge: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                Serviceable radius (km)
                <input
                  type="number"
                  step="0.5"
                  value={form.deliveryRadiusKm}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryRadiusKm: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                Avg prep time (minutes)
                <input
                  type="number"
                  value={form.avgPrepMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, avgPrepMinutes: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="border-t p-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDrawer()}
                className="w-full rounded-xl bg-[#FF6B35] py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save store config'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
