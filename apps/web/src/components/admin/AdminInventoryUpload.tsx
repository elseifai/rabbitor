'use client'

import { useCallback, useEffect, useState } from 'react'
import type { StoreType } from '@rabbit/database'
import { formatCurrency } from '@/lib/utils'
import { ImageFilePicker } from '@/components/shared/ImageFilePicker'
import { BulkProductImport } from '@/components/shared/BulkProductImport'

const STORE_TYPES: StoreType[] = [
  'KIRANA', 'FISH', 'VEGETABLE', 'PHARMACY', 'BAKERY', 'DAIRY', 'MEAT', 'GENERAL',
]

// PLATFORM CORE RESOLUTION — admin global inventory with file upload + bulk import
export function AdminInventoryUpload() {
  const [catalogItems, setCatalogItems] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [savingCatalog, setSavingCatalog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [catalogForm, setCatalogForm] = useState({
    name: '',
    storeType: 'GENERAL' as StoreType,
    category: 'general',
    basePrice: '',
    description: '',
    defaultUnit: 'piece',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/master-catalog')
      const json = await res.json()
      if (json.success) setCatalogItems(json.data ?? [])
      else setError(json.error)
    } catch {
      setError('Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const submitCatalogItem = async () => {
    setSavingCatalog(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/master-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catalogForm.name,
          storeType: catalogForm.storeType,
          category: catalogForm.category,
          basePrice: parseFloat(catalogForm.basePrice),
          description: catalogForm.description,
          defaultUnit: catalogForm.defaultUnit,
          imageUrl: imageUrl ?? undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Save failed')
      setCatalogForm({
        name: '',
        storeType: 'GENERAL',
        category: 'general',
        basePrice: '',
        description: '',
        defaultUnit: 'piece',
      })
      setImageUrl(null)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingCatalog(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="text-sm font-black text-gray-900">Add Master Catalog Item</h3>
        <p className="mt-1 text-xs text-gray-500">Populates the universal lookup catalog for all merchants.</p>
        <div className="mt-4 space-y-3">
          <ImageFilePicker value={imageUrl} onChange={setImageUrl} />
          <input
            value={catalogForm.name}
            onChange={(e) => setCatalogForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Product name"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <select
            value={catalogForm.storeType}
            onChange={(e) => setCatalogForm((f) => ({ ...f, storeType: e.target.value as StoreType }))}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          >
            {STORE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            value={catalogForm.category}
            onChange={(e) => setCatalogForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Category slug"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <input
            value={catalogForm.basePrice}
            onChange={(e) => setCatalogForm((f) => ({ ...f, basePrice: e.target.value }))}
            placeholder="Base price (₹)"
            type="number"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <input
            value={catalogForm.defaultUnit}
            onChange={(e) => setCatalogForm((f) => ({ ...f, defaultUnit: e.target.value }))}
            placeholder="Weight variant / unit"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <textarea
            value={catalogForm.description}
            onChange={(e) => setCatalogForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Default description"
            rows={2}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            disabled={savingCatalog || !catalogForm.name || !catalogForm.basePrice}
            onClick={() => void submitCatalogItem()}
            className="w-full rounded-xl bg-[#FF6B35] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {savingCatalog ? 'Uploading…' : 'Add to Global Catalog'}
          </button>
        </div>

        <BulkProductImport mode="admin" onComplete={() => void load()} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <h3 className="border-b px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">
          Catalog Items ({catalogItems.length})
        </h3>
        <div className="max-h-[640px] divide-y overflow-y-auto">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : catalogItems.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No admin-uploaded items yet</p>
          ) : (
            catalogItems.map((item) => (
              <div key={String(item.id)} className="flex gap-3 px-4 py-3">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={String(item.imageUrl)} alt="" className="h-12 w-12 rounded-lg bg-gray-100 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-xs font-bold text-orange-500">
                    R
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{String(item.name)}</p>
                  <p className="text-xs text-gray-500">
                    {String(item.storeType)} · {String(item.category)} ·{' '}
                    {formatCurrency(Number(item.basePrice ?? 0))}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
