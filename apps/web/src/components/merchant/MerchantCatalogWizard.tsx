'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Plus, Search, X } from 'lucide-react'
import type { StoreType } from '@rabbit/database'
import { addProductFromCatalogAction } from '@/actions/merchant'
import { FileUploader } from '@/components/ui/file-uploader'
import {
  CATALOG_CATEGORY_LABELS,
  searchCatalogTemplates,
  type CatalogTemplate,
} from '@/config/master-catalog'
import { parseBaselineStockFromDescription } from '@/lib/catalog-baseline-stock'
import { cn } from '@/lib/utils'

// MERCHANT SIDEBAR & CATALOG REFACTOR — one-click add catalog wizard (DB-first lineage)
export function MerchantCatalogWizard({
  shopId,
  storeType,
  assignedCatalogIds,
  open,
  onClose,
  onAdded,
}: {
  shopId: string
  storeType: StoreType
  /** Master catalog UUIDs already activated for this shop. */
  assignedCatalogIds: Set<string>
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [selected, setSelected] = useState<CatalogTemplate | null>(null)
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('20')
  const [unit, setUnit] = useState('')
  const [variantIdx, setVariantIdx] = useState(0)
  const [isAvailable, setIsAvailable] = useState(true)
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbTemplates, setDbTemplates] = useState<CatalogTemplate[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [useDbCatalog, setUseDbCatalog] = useState(false)

  // DB-first: live master bank from GET /api/merchant/master-catalog
  useEffect(() => {
    if (!open) return
    setCatalogLoading(true)
    void fetch(`/api/merchant/master-catalog?storeType=${storeType}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setDbTemplates(json.data as CatalogTemplate[])
          setUseDbCatalog(true)
        } else {
          setDbTemplates([])
          setUseDbCatalog(false)
        }
      })
      .catch(() => {
        setDbTemplates([])
        setUseDbCatalog(false)
      })
      .finally(() => setCatalogLoading(false))
  }, [open, storeType])

  const catalogTemplates = useMemo(() => {
    if (useDbCatalog && dbTemplates.length > 0) return dbTemplates
    return searchCatalogTemplates(storeType, '', 'ALL')
  }, [useDbCatalog, dbTemplates, storeType])

  const categories = useMemo(() => {
    const cats = new Set(catalogTemplates.map((i) => i.category))
    return ['ALL', ...Array.from(cats).sort()]
  }, [catalogTemplates])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalogTemplates.filter((item) => {
      const matchCategory = category === 'ALL' || item.category === category
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      return matchCategory && matchQuery
    })
  }, [catalogTemplates, query, category])

  const isInStore = (item: CatalogTemplate) => {
    const masterId = item.id.startsWith('db-') ? item.id.slice(3) : item.id
    return assignedCatalogIds.has(masterId)
  }

  const resetCustomize = (item: CatalogTemplate) => {
    setSelected(item)
    setPrice(String(item.suggestedPrice))
    setStock(String(parseBaselineStockFromDescription(item.description)))
    setUnit(item.defaultUnit)
    setVariantIdx(0)
    setIsAvailable(true)
    setDescription(item.description)
    setImageUrl(item.imageUrl ?? null)
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
    const stockQty = parseInt(stock, 10)
    const parsedStock = Number.isFinite(stockQty) ? stockQty : parseBaselineStockFromDescription(selected.description)

    const res = await addProductFromCatalogAction({
      shopId,
      catalogId: selected.id,
      name: selected.name,
      description: description.trim() || selected.description,
      category: selected.category,
      price: finalPrice,
      unit: finalUnit,
      stock: parsedStock,
      isAvailable,
      imageUrl: imageUrl ?? selected.imageUrl,
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
              {useDbCatalog ? ' · live master bank' : ' · offline fallback'}
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
              {catalogLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#FF6B35]" />
                </div>
              ) : results.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No matching items</p>
              ) : (
                results.map((item) => {
                  const added = isInStore(item)
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border p-3 transition',
                        added
                          ? 'border-gray-200 bg-gray-100/80 opacity-75'
                          : 'border-gray-100 bg-gray-50/50',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              'truncate text-sm font-bold',
                              added ? 'text-gray-500' : 'text-gray-900',
                            )}
                          >
                            {item.name}
                          </p>
                          {added && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
                              <Check className="h-3 w-3" />
                              Added to Store
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-500">{item.description}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase text-[#FF6B35]">
                          ₹{item.suggestedPrice} · {item.defaultUnit}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={added}
                        onClick={() => resetCustomize(item)}
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md transition',
                          added
                            ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                            : 'bg-[#0C831F] text-white hover:scale-105 active:scale-95',
                        )}
                        aria-label={added ? `${item.name} already in store` : `Add ${item.name}`}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  )
                })
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

            <FileUploader
              value={imageUrl}
              onChange={setImageUrl}
              label="Product image"
              aspect="square"
            />

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
