'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, Search, X } from 'lucide-react'
import type { StoreType } from '@rabbit/database'
import { addProductFromCatalogAction } from '@/actions/merchant'
import {
  CATALOG_CATEGORY_LABELS,
  getCatalogCategories,
  searchCatalogTemplates,
  type CatalogTemplate,
} from '@/config/master-catalog'
import { cn } from '@/lib/utils'

// MERCHANT SIDEBAR & CATALOG REFACTOR — one-click add catalog wizard
export function MerchantCatalogWizard({
  shopId,
  storeType,
  open,
  onClose,
  onAdded,
}: {
  shopId: string
  storeType: StoreType
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [selected, setSelected] = useState<CatalogTemplate | null>(null)
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('10')
  const [unit, setUnit] = useState('')
  const [variantIdx, setVariantIdx] = useState(0)
  const [isAvailable, setIsAvailable] = useState(true)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = useMemo(() => getCatalogCategories(storeType), [storeType])
  const results = useMemo(
    () => searchCatalogTemplates(storeType, query, category),
    [storeType, query, category],
  )

  const resetCustomize = (item: CatalogTemplate) => {
    setSelected(item)
    setPrice(String(item.suggestedPrice))
    setStock('10')
    setUnit(item.defaultUnit)
    setVariantIdx(0)
    setIsAvailable(true)
    setDescription(item.description)
    setError(null)
  }

  const closeAll = () => {
    setSelected(null)
    setQuery('')
    setCategory('ALL')
    setError(null)
    onClose()
  }

  const handleSave = async () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)

    const variant = selected.variants?.[variantIdx]
    const finalUnit = unit.trim() || variant?.unit || selected.defaultUnit
    const basePrice = parseFloat(price)
    const finalPrice = basePrice + (variant?.priceDelta ?? 0)

    const res = await addProductFromCatalogAction({
      shopId,
      catalogId: selected.id,
      name: selected.name,
      description: description.trim() || selected.description,
      category: selected.category,
      price: finalPrice,
      unit: finalUnit,
      stock: parseInt(stock, 10) || 10,
      isAvailable,
      imageUrl: selected.imageUrl,
    })

    setSubmitting(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    setSelected(null)
    onAdded()
    closeAll()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-black text-gray-900">
              {selected ? 'Customize & Save' : 'Add from Catalog'}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {storeType} templates
            </p>
          </div>
          <button type="button" onClick={closeAll} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!selected ? (
          <div className="flex flex-1 flex-col overflow-hidden p-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Maggi, Surmai, shampoo…"
                  className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm focus:border-[#FF6B35] focus:outline-none"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="max-w-[140px] rounded-xl border px-2 py-2 text-xs font-semibold"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'ALL' ? 'All categories' : CATALOG_CATEGORY_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
              {results.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No matching items</p>
              ) : (
                results.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                      <p className="truncate text-xs text-gray-500">{item.description}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase text-[#FF6B35]">
                        ₹{item.suggestedPrice} · {item.defaultUnit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => resetCustomize(item)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0C831F] text-white shadow-md hover:scale-105 active:scale-95"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto p-5">
            <div className="rounded-xl border border-[#FF6B35]/20 bg-[#FFF3ED]/50 p-4">
              <p className="text-sm font-black text-gray-900">{selected.name}</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-lg border bg-white px-3 py-2 text-xs focus:border-[#FF6B35] focus:outline-none"
              />
            </div>

            {selected.variants && selected.variants.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Pack size</p>
                <div className="flex flex-wrap gap-2">
                  {selected.variants.map((v, i) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => {
                        setVariantIdx(i)
                        setUnit(v.unit)
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-bold',
                        variantIdx === i
                          ? 'border-[#FF6B35] bg-[#FFF3ED] text-[#FF6B35]'
                          : 'border-gray-200 text-gray-600',
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-500">Selling price (₹)</span>
                <input
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:border-[#FF6B35] focus:outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-500">Stock qty</span>
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:border-[#FF6B35] focus:outline-none"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-500">Unit / weight</span>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-[#FF6B35] focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsAvailable((v) => !v)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold',
                isAvailable ? 'border-green-200 bg-green-50 text-[#0C831F]' : 'border-gray-200 bg-gray-50 text-gray-500',
              )}
            >
              <span>Availability</span>
              <span>{isAvailable ? 'In Stock' : 'Out of Stock'}</span>
            </button>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border py-3 text-xs font-bold text-gray-600"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSave()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save to Store
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
