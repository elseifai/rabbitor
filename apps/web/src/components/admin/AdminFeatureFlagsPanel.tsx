'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { FeatureFlags } from '@/lib/feature-flags'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/feature-flags'

export function AdminFeatureFlagsPanel() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS)
  const [checkout, setCheckout] = useState({
    globalMinCartValue: 0,
    multiShopRoutingFeePerLeg: 25,
    freeDeliveryThreshold: 499,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/api/admin/platform-settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setCheckout({
            globalMinCartValue: json.data.globalMinCartValue,
            multiShopRoutingFeePerLeg: json.data.multiShopRoutingFeePerLeg,
            freeDeliveryThreshold: json.data.freeDeliveryThreshold,
          })
          if (json.data.featureFlags) setFlags(json.data.featureFlags)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...checkout, featureFlags: flags }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Save failed')
      setMessage('Runtime config updated — client apps will pick up within 30s cache TTL')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed')
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
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Central feature flag matrix — injected into customer, merchant, and rider apps via{' '}
        <code className="rounded bg-gray-100 px-1 text-xs">/api/platform/config</code>
      </p>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B35]">Customer app</h3>
        <div className="mt-4 space-y-3">
          <ToggleRow
            label="Razorpay payment gateway"
            checked={flags.customer.razorpayEnabled}
            onChange={(v) => setFlags((f) => ({ ...f, customer: { ...f.customer, razorpayEnabled: v } }))}
          />
          <ToggleRow
            label="Multi-store cart building"
            checked={flags.customer.multiStoreCart}
            onChange={(v) => setFlags((f) => ({ ...f, customer: { ...f.customer, multiStoreCart: v } }))}
          />
          <ToggleRow
            label="Promotional banner carousels"
            checked={flags.customer.promoBannerEnabled}
            onChange={(v) => setFlags((f) => ({ ...f, customer: { ...f.customer, promoBannerEnabled: v } }))}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-blue-600">Merchant app</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-600">
            Uniform prep-time constraint (minutes, blank = shop default)
            <input
              type="number"
              value={flags.merchant.uniformPrepMinutes ?? ''}
              onChange={(e) =>
                setFlags((f) => ({
                  ...f,
                  merchant: {
                    ...f.merchant,
                    uniformPrepMinutes: e.target.value ? Number(e.target.value) : null,
                  },
                }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </label>
          <ToggleRow
            label="Automated order auto-acceptance"
            checked={flags.merchant.autoAcceptOrders}
            onChange={(v) => setFlags((f) => ({ ...f, merchant: { ...f.merchant, autoAcceptOrders: v } }))}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#0C831F]">Rider app</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-gray-600">
            Min routing fee per leg (₹)
            <input
              type="number"
              value={flags.rider.minRoutingFeePerLeg}
              onChange={(e) =>
                setFlags((f) => ({
                  ...f,
                  rider: { ...f.rider, minRoutingFeePerLeg: Number(e.target.value) },
                }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-gray-600">
            GPS ping interval (seconds)
            <input
              type="number"
              value={flags.rider.gpsPingIntervalSec}
              onChange={(e) =>
                setFlags((f) => ({
                  ...f,
                  rider: { ...f.rider, gpsPingIntervalSec: Number(e.target.value) },
                }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Checkout thresholds</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold">
            Global min cart (₹)
            <input
              type="number"
              value={checkout.globalMinCartValue}
              onChange={(e) => setCheckout((c) => ({ ...c, globalMinCartValue: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Multi-store fee / leg (₹)
            <input
              type="number"
              value={checkout.multiShopRoutingFeePerLeg}
              onChange={(e) =>
                setCheckout((c) => ({ ...c, multiShopRoutingFeePerLeg: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Free delivery above (₹)
            <input
              type="number"
              value={checkout.freeDeliveryThreshold}
              onChange={(e) =>
                setCheckout((c) => ({ ...c, freeDeliveryThreshold: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {message && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-black uppercase text-white disabled:opacity-50"
      >
        {saving ? 'Publishing…' : 'Publish runtime config'}
      </button>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-14 rounded-full transition ${checked ? 'bg-[#0C831F]' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${checked ? 'left-7' : 'left-0.5'}`}
        />
      </button>
    </label>
  )
}
