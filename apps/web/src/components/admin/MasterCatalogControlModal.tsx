'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Loader2, Star, Store, X } from 'lucide-react'
import { FileUploader } from '@/components/ui/file-uploader'
import { formatCurrency, cn } from '@/lib/utils'
import type { CatalogItemType } from '@rabbit/database'

type CatalogDetail = {
  item: {
    id: string
    sku: string | null
    name: string
    description: string | null
    itemType: CatalogItemType
    category: string
    subcategory: string | null
    basePrice: number
    imageUrl: string | null
    storeType: string
    lifetimeOrdersCount: number
    lifetimeRevenue: number
    customerFeedbackPositivePercent: number
    velocityLabel: string
  }
  assortment: {
    shopId: string
    shopName: string
    storeType: string
    isActive: boolean
    productId: string
    storePrice: number
    stock: number
    binLocation: string | null
    isAvailable: boolean
  }[]
  feedback: {
    reviews: { stars: number; riderStars: number; comment: string | null; date: string }[]
    refundCount: number
    positivePercent: number
  }
}

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'assortment', label: 'Store Spread' },
  { id: 'feedback', label: 'Sentiment Radar' },
] as const

type TabId = (typeof TABS)[number]['id']

export function MasterCatalogControlModal({
  itemId,
  itemName,
  open,
  onClose,
  onSaved,
  initialTab = 'profile',
}: {
  itemId: string | null
  itemName: string
  open: boolean
  onClose: () => void
  onSaved?: () => void
  initialTab?: TabId
}) {
  const [tab, setTab] = useState<TabId>(initialTab)
  const [data, setData] = useState<CatalogDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    subcategory: '',
    description: '',
    basePrice: '',
    itemType: 'VEG' as CatalogItemType,
    imageUrl: null as string | null,
  })

  const load = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/catalog/${itemId}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        const item = json.data.item
        setForm({
          name: item.name,
          sku: item.sku ?? '',
          category: item.category,
          subcategory: item.subcategory ?? '',
          description: item.description ?? '',
          basePrice: String(item.basePrice),
          itemType: item.itemType,
          imageUrl: item.imageUrl,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    if (open && itemId) {
      setTab(initialTab)
      void load()
    }
  }, [open, itemId, initialTab, load])

  const saveProfile = async () => {
    if (!itemId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/catalog/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          category: form.category,
          subcategory: form.subcategory || null,
          description: form.description || null,
          basePrice: Number(form.basePrice),
          itemType: form.itemType,
          imageUrl: form.imageUrl,
        }),
      })
      const json = await res.json()
      if (json.success) {
        onSaved?.()
        void load()
      }
    } finally {
      setSaving(false)
    }
  }

  if (!open || !itemId) return null

  const starDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars: `${stars}★`,
    count: data?.feedback.reviews.filter((r) => r.stars === stars).length ?? 0,
  }))

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/75 p-0 sm:items-center sm:p-4">
      <div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[90vh] sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between border-b bg-slate-900 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Master Control Command Center
            </p>
            <h2 className="mt-1 text-xl font-black">{itemName}</h2>
            {data && (
              <p className="mt-1 text-xs text-slate-300">
                {data.item.velocityLabel} · {data.item.lifetimeOrdersCount} units ·{' '}
                ⭐ {data.item.customerFeedbackPositivePercent}% positive
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b bg-slate-50 px-4 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide',
                tab === t.id ? 'bg-[#FF6B35] text-white' : 'text-slate-500 hover:bg-white',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
            </div>
          )}

          {!loading && data && tab === 'profile' && (
            <div className="mx-auto max-w-2xl space-y-5">
              <FileUploader
                value={form.imageUrl}
                onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                label="Product image"
                aspect="square"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-gray-600 sm:col-span-2">
                  Product name
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  SKU / Barcode
                  <input
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  Base price (₹)
                  <input
                    type="number"
                    value={form.basePrice}
                    onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  Category
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  Subcategory
                  <input
                    value={form.subcategory}
                    onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-600 sm:col-span-2">
                  Type
                  <select
                    value={form.itemType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, itemType: e.target.value as CatalogItemType }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="VEG">VEG</option>
                    <option value="NON_VEG">NON-VEG</option>
                    <option value="EGG">EGG</option>
                    <option value="SHORT_SHELF">SHORT-SHELF</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-600 sm:col-span-2">
                  Description
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveProfile()}
                className="w-full rounded-xl bg-[#FF6B35] py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save master profile'}
              </button>
            </div>
          )}

          {!loading && data && tab === 'assortment' && (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-white">
                  <tr>
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Store price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Bin / shelf</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.assortment.map((row) => (
                    <tr key={row.productId} className="hover:bg-orange-50/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-bold">{row.shopName}</p>
                            <p className="text-[10px] uppercase text-gray-400">{row.storeType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        {formatCurrency(row.storePrice)}
                      </td>
                      <td className="px-4 py-3 font-bold">{row.stock}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.binLocation ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-black uppercase',
                            row.isAvailable && row.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700',
                          )}
                        >
                          {row.isAvailable && row.isActive ? 'Live' : 'Off'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.assortment.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                        Not deployed to any live shops yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && data && tab === 'feedback' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-emerald-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase text-emerald-600">Positive feedback</p>
                  <p className="mt-1 text-3xl font-black text-emerald-800">
                    ⭐ {data.feedback.positivePercent}%
                  </p>
                </div>
                <div className="rounded-2xl border bg-amber-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase text-amber-600">Review logs</p>
                  <p className="mt-1 text-3xl font-black text-amber-800">
                    {data.feedback.reviews.length}
                  </p>
                </div>
                <div className="rounded-2xl border bg-red-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase text-red-600">Returns / refunds</p>
                  <p className="mt-1 text-3xl font-black text-red-800">{data.feedback.refundCount}</p>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="mb-3 text-xs font-black uppercase text-slate-400">Star distribution</p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={starDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="stars" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-slate-400">Customer feedback log</p>
                {data.feedback.reviews.length === 0 ? (
                  <p className="text-sm text-gray-400">No reviews for orders containing this item.</p>
                ) : (
                  data.feedback.reviews.map((r, i) => (
                    <div key={i} className="rounded-xl border px-4 py-3">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: r.stars }).map((_, j) => (
                          <Star key={j} className="h-3.5 w-3.5 fill-amber-400" />
                        ))}
                        <span className="ml-2 text-[10px] text-gray-400">
                          {new Date(r.date).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      {r.comment && <p className="mt-1 text-sm text-gray-700">{r.comment}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}