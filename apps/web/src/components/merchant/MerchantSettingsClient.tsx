'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import {
  getMerchantSettingsAction,
  updateMerchantSettingsAction,
  toggleShopOpenAction,
} from '@/actions/merchant'
import { formatCurrency } from '@/lib/utils'

type Settings = NonNullable<Awaited<ReturnType<typeof getMerchantSettingsAction>>>

export function MerchantSettingsClient() {
  const [shop, setShop] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [minOrderValue, setMinOrderValue] = useState('')
  const [baseDeliveryFee, setBaseDeliveryFee] = useState('')
  const [avgPrepMinutes, setAvgPrepMinutes] = useState('')
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('')

  const load = () => {
    getMerchantSettingsAction()
      .then((data) => {
        setShop(data)
        if (data) {
          setMinOrderValue(String(data.minOrderValue))
          setBaseDeliveryFee(String(data.baseDeliveryFee))
          setAvgPrepMinutes(String(data.avgPrepMinutes))
          setDeliveryRadiusKm(String(data.deliveryRadiusKm))
        }
      })
      .catch(() => setShop(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const toggleOpen = async () => {
    if (!shop) return
    const res = await toggleShopOpenAction(shop.id, !shop.isActive)
    if (res.ok) {
      setShop({ ...shop, isActive: res.isActive })
    }
  }

  const save = async () => {
    if (!shop) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await updateMerchantSettingsAction({
      shopId: shop.id,
      minOrderValue: parseFloat(minOrderValue) || 0,
      baseDeliveryFee: parseFloat(baseDeliveryFee) || 0,
      avgPrepMinutes: parseInt(avgPrepMinutes, 10) || 15,
      deliveryRadiusKm: parseFloat(deliveryRadiusKm) || 5,
    })

    setSaving(false)
    if (!res.ok) {
      setError(res.error ?? 'Could not save settings')
      return
    }
    setSaved(true)
    load()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-rabbit-600" />
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="text-gray-600">No shop linked to this account.</p>
        <Link href="/merchant/login" className="mt-4 text-rabbit-600">
          Log in as merchant (9876543210)
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">{shop.name}</h3>
            <p className="text-sm text-gray-500">{shop.category} · /shops/{shop.slug}</p>
            <p className="mt-1 text-xs text-gray-400">{shop.address}</p>
          </div>
          <button
            type="button"
            onClick={() => void toggleOpen()}
            className={`relative h-10 w-[4.5rem] shrink-0 rounded-full transition ${
              shop.isActive ? 'bg-rabbit-600' : 'bg-gray-300'
            }`}
            aria-label="Toggle shop open"
          >
            <span
              className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition ${
                shop.isActive ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Shop is {shop.isActive ? 'open and accepting orders' : 'closed'}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-gray-900">Delivery settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          These values affect customer checkout and delivery quotes
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Minimum order (₹)</span>
            <input
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Base delivery fee (₹)</span>
            <input
              value={baseDeliveryFee}
              onChange={(e) => setBaseDeliveryFee(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Avg prep time (mins)</span>
            <input
              value={avgPrepMinutes}
              onChange={(e) => setAvgPrepMinutes(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Delivery radius (km)</span>
            <input
              value={deliveryRadiusKm}
              onChange={(e) => setDeliveryRadiusKm(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Current min order: {formatCurrency(shop.minOrderValue)} · Fee:{' '}
          {formatCurrency(shop.baseDeliveryFee)}
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {saved && (
          <p className="mt-3 rounded-lg bg-rabbit-50 px-3 py-2 text-sm text-rabbit-700">
            Settings saved successfully.
          </p>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 font-semibold text-white disabled:opacity-40 sm:w-auto sm:px-8"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save settings
        </button>
      </div>
    </div>
  )
}
