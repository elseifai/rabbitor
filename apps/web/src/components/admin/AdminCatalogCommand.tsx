'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Edit3, Loader2, Package, Plus, Search, UploadCloud } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import {
  itemTypeBadgeClass,
  itemTypeLabel,
  velocityBadgeClass,
  type CatalogVelocityBadge,
} from '@/lib/catalog-performance'
import type { CatalogItemType } from '@rabbit/database'
import { MasterCatalogControlModal } from '@/components/admin/MasterCatalogControlModal'

type CatalogItem = {
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
  velocityRank: number
  velocityBadge: CatalogVelocityBadge
  velocityLabel: string
}

type Shop = { id: string; name: string }

type UploadResult = {
  upserted: number
  skipped: number
  lineErrors: string[]
}

export function AdminCatalogCommand() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [controlItem, setControlItem] = useState<CatalogItem | null>(null)
  const [controlTab, setControlTab] = useState<'profile' | 'assortment' | 'feedback'>('profile')
  const [bindItem, setBindItem] = useState<CatalogItem | null>(null)
  const [bindForm, setBindForm] = useState({
    shopId: '',
    storePrice: '',
    stock: '10',
    maxPurchaseQty: '5',
    binLocation: '',
  })
  const [binding, setBinding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [catRes, shopRes] = await Promise.all([
        fetch(`/api/admin/catalog?q=${encodeURIComponent(query)}`),
        fetch('/api/admin/shops'),
      ])
      const catJson = await catRes.json()
      const shopJson = await shopRes.json()
      if (catJson.success) setItems(catJson.data ?? [])
      if (shopJson.success) setShops(shopJson.data ?? [])
    } catch {
      setError('Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  const summary = useMemo(
    () => ({
      total: items.length,
      highVelocity: items.filter((i) => i.velocityBadge === 'high').length,
      avgFeedback:
        items.length > 0
          ? Math.round(
              items.reduce((s, i) => s + i.customerFeedbackPositivePercent, 0) / items.length,
            )
          : 0,
    }),
    [items],
  )

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      setUploading(true)
      setUploadProgress(15)
      setUploadResult(null)
      setError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        setUploadProgress(45)
        const res = await fetch('/api/admin/catalog/bulk-upload', { method: 'POST', body: form })
        setUploadProgress(85)
        const json = await res.json()
        if (!json.success) throw new Error(json.error ?? 'Upload failed')
        setUploadProgress(100)
        setUploadResult({
          upserted: json.upserted ?? 0,
          skipped: json.skipped ?? 0,
          lineErrors: json.lineErrors ?? json.errors ?? [],
        })
        void load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [load],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (f) => void onDrop(f),
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: uploading,
  })

  const openControl = (item: CatalogItem, tab: 'profile' | 'assortment' | 'feedback' = 'profile') => {
    setControlTab(tab)
    setControlItem(item)
  }

  const bindToShop = async () => {
    if (!bindItem || !bindForm.shopId) return
    setBinding(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/catalog/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogItemId: bindItem.id,
          shopId: bindForm.shopId,
          storePrice: bindForm.storePrice ? Number(bindForm.storePrice) : undefined,
          stock: Number(bindForm.stock),
          maxPurchaseQty: Number(bindForm.maxPurchaseQty),
          binLocation: bindForm.binLocation,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Bind failed')
      setBindItem(null)
      setBindForm({ shopId: '', storePrice: '', stock: '10', maxPurchaseQty: '5', binLocation: '' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bind failed')
    } finally {
      setBinding(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/80 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-orange-600">
              Bulk Import Master Catalog
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              CSV headers: sku, name, category, subcategory, base_price, description, type
            </p>
          </div>
          <div className="flex gap-4 text-center text-xs">
            <div>
              <p className="font-black text-2xl text-gray-900">{summary.total}</p>
              <p className="text-gray-400">Templates</p>
            </div>
            <div>
              <p className="font-black text-2xl text-yellow-600">{summary.highVelocity}</p>
              <p className="text-gray-400">High velocity</p>
            </div>
            <div>
              <p className="font-black text-2xl text-emerald-600">{summary.avgFeedback}%</p>
              <p className="text-gray-400">Avg satisfaction</p>
            </div>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            'mt-4 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
            isDragActive
              ? 'border-orange-400 bg-orange-100/50'
              : 'border-orange-200 bg-white/60 hover:border-orange-300',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
          ) : (
            <UploadCloud className="mx-auto h-8 w-8 text-orange-500" />
          )}
          <p className="mt-2 text-sm font-bold text-gray-800">
            {uploading ? 'Uploading & validating rows…' : 'Bulk Import Master Catalog (.csv)'}
          </p>
          <p className="mt-1 text-xs text-gray-500">Drop file here or click to browse</p>
        </div>

        {(uploading || uploadProgress > 0) && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-orange-500 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {uploadResult && (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
            <p className="font-bold text-emerald-800">
              ✓ Upserted {uploadResult.upserted} items · skipped {uploadResult.skipped} rows
            </p>
            {uploadResult.lineErrors.length > 0 && (
              <ul className="mt-2 max-h-24 overflow-y-auto text-xs text-red-600">
                {uploadResult.lineErrors.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border bg-white p-3">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU, name, category…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-white">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category / Type</th>
              <th className="px-4 py-3">Net price</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Satisfaction</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No templates — bulk import a CSV to begin
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-orange-50/20">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex max-w-[140px] rounded-full px-2 py-1 text-[9px] font-black leading-tight ring-1',
                        velocityBadgeClass(item.velocityBadge),
                      )}
                    >
                      {item.velocityLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <Package className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => openControl(item)}
                          className="text-left font-bold text-gray-900 underline-offset-2 hover:text-[#FF6B35] hover:underline"
                        >
                          {item.name}
                        </button>
                        <p className="font-mono text-[10px] text-gray-400">{item.sku ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold capitalize">{item.category}</p>
                    {item.subcategory && (
                      <p className="text-[10px] text-gray-400">{item.subcategory}</p>
                    )}
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ring-1',
                        itemTypeBadgeClass(item.itemType),
                      )}
                    >
                      {itemTypeLabel(item.itemType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#0C831F]">
                    {formatCurrency(item.basePrice)}
                  </td>
                  <td className="px-4 py-3 font-bold">{item.lifetimeOrdersCount}</td>
                  <td className="px-4 py-3 font-bold">{formatCurrency(item.lifetimeRevenue)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                      ⭐ {item.customerFeedbackPositivePercent}% Positive
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        title="Quick edit"
                        onClick={() => openControl(item, 'profile')}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:border-orange-300 hover:text-orange-600"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        title="Bind to shop"
                        onClick={() => {
                          setBindItem(item)
                          setBindForm((f) => ({ ...f, storePrice: String(item.basePrice) }))
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MasterCatalogControlModal
        itemId={controlItem?.id ?? null}
        itemName={controlItem?.name ?? ''}
        open={!!controlItem}
        initialTab={controlTab}
        onClose={() => setControlItem(null)}
        onSaved={() => void load()}
      />

      {bindItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-bold">Bind to shop</h3>
            <p className="text-sm text-gray-500">{bindItem.name}</p>
            <div className="mt-4 space-y-3">
              <select
                value={bindForm.shopId}
                onChange={(e) => setBindForm((f) => ({ ...f, shopId: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="">Select shop…</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Store price"
                value={bindForm.storePrice}
                onChange={(e) => setBindForm((f) => ({ ...f, storePrice: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              <input
                placeholder="Bin location"
                value={bindForm.binLocation}
                onChange={(e) => setBindForm((f) => ({ ...f, binLocation: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setBindItem(null)}
                className="flex-1 rounded-xl border py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={binding}
                onClick={() => void bindToShop()}
                className="flex-1 rounded-xl bg-orange-500 py-2 text-sm font-bold text-white"
              >
                Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
