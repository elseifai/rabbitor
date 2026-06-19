'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Check,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import type { StoreType } from '@rabbit/database'
import {
  getMerchantShopAction,
  toggleProductAvailabilityAction,
  updateProductPriceAction,
} from '@/actions/merchant'
import { MerchantCatalogWizard } from '@/components/merchant/MerchantCatalogWizard'
import { MerchantEditProductModal, type EditableProduct } from '@/components/merchant/MerchantEditProductModal'
import { MerchantManualProductModal } from '@/components/merchant/MerchantManualProductModal'
import { BulkProductImport } from '@/components/shared/BulkProductImport'
import { CATALOG_CATEGORY_LABELS } from '@/config/master-catalog'
import { formatCurrency } from '@/lib/utils'

type ProductRow = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  stock: number
  available: boolean
  image?: string | null
  masterCatalogItemId?: string | null
}

// MERCHANT SIDEBAR & CATALOG REFACTOR — product listing with catalog search grid
export function MerchantProductListing() {
  const [shopId, setShopId] = useState<string | null>(null)
  const [storeType, setStoreType] = useState<StoreType>('GENERAL')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [stockWarnings, setStockWarnings] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setRefreshing(true)
    const shop = await getMerchantShopAction()
    if (shop) {
      setShopId(shop.id)
      setStoreType(shop.storeType)
      setProducts(
        shop.products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          unit: p.unit,
          stock: p.stock,
          available: p.isAvailable,
          image: p.image,
          masterCatalogItemId: p.masterCatalogItemId,
        })),
      )
    }
    try {
      const res = await fetch('/api/merchant/health')
      const json = await res.json()
      if (json.success) {
        setStockWarnings(new Set((json.stockWarnings ?? []).map((w: { id: string }) => w.id)))
      }
    } catch {
      setStockWarnings(new Set())
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q),
    )
  }, [products, search])

  const assignedCatalogIds = useMemo(
    () =>
      new Set(
        products
          .map((p) => p.masterCatalogItemId)
          .filter((id): id is string => Boolean(id)),
      ),
    [products],
  )

  const toggleStock = async (id: string) => {
    const item = products.find((p) => p.id === id)
    if (!item) return
    const next = !item.available
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, available: next } : p)))
    const res = await toggleProductAvailabilityAction(id, next)
    if (!res.ok) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, available: !next } : p)))
    }
  }

  const savePrice = async (id: string) => {
    const parsed = parseFloat(editPrice)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setEditingId(null)
      return
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price: parsed } : p)))
    setEditingId(null)
    const res = await updateProductPriceAction(id, parsed)
    if (!res.ok) void load()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  if (!shopId) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
        <p className="font-bold text-amber-900">No store registered</p>
        <Link href="/merchant/signup" className="mt-3 inline-block rounded-xl bg-[#FF6B35] px-4 py-2 text-xs font-bold text-white">
          Complete signup →
        </Link>
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
            placeholder="Search your inventory…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm focus:border-[#FF6B35] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="rounded-xl border p-2.5 text-gray-500 hover:text-[#FF6B35] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-bold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="flex items-center gap-2 rounded-xl border-2 border-orange-500 bg-white px-4 py-2.5 text-sm font-bold text-orange-500 hover:bg-orange-50"
        >
          <Plus className="h-4 w-4" />
          Create Custom Product Manually
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {products.length} items in stock · Catalog templates for{' '}
        <span className="font-bold text-[#FF6B35]">{storeType}</span> store type
      </p>

      {shopId && (
        <BulkProductImport mode="merchant" shopId={shopId} onComplete={() => void load()} />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="font-bold text-gray-700">No products yet</p>
          <p className="mt-1 text-sm text-gray-400">Use Add Product to clone from the master catalog</p>
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="mt-4 rounded-xl bg-[#0C831F] px-5 py-2 text-xs font-black uppercase tracking-wider text-white"
          >
            Open catalog wizard
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="hidden px-4 py-3 sm:table-cell">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="hidden px-4 py-3 md:table-cell">Stock</th>
                <th className="px-4 py-3 text-right">Live</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => {
                const warn = stockWarnings.has(item.id)
                return (
                  <tr key={item.id} className={warn ? 'bg-amber-50/60' : 'hover:bg-gray-50/50'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {warn && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
                        <div>
                          <button
                            type="button"
                            onClick={() => setEditingProduct(item)}
                            className={`text-left font-bold hover:text-[#FF6B35] hover:underline ${item.available ? 'text-gray-900' : 'text-gray-400 line-through'}`}
                          >
                            {item.name}
                          </button>
                          <p className="text-xs text-gray-400">{item.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                        {CATALOG_CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">₹</span>
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-16 rounded border px-1 py-0.5 text-xs font-bold"
                          />
                          <button type="button" onClick={() => void savePrice(item.id)}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-bold">{formatCurrency(item.price)}</span>
                          <button type="button" onClick={() => { setEditingId(item.id); setEditPrice(String(item.price)) }}>
                            <Edit2 className="h-3 w-3 text-gray-400 hover:text-[#FF6B35]" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className={item.stock <= 3 ? 'font-bold text-amber-600' : 'text-gray-600'}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => void toggleStock(item.id)}>
                        {item.available ? (
                          <ToggleRight className="ml-auto h-7 w-7 text-[#FF6B35]" />
                        ) : (
                          <ToggleLeft className="ml-auto h-7 w-7 text-gray-300" />
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <MerchantCatalogWizard
        shopId={shopId}
        storeType={storeType}
        assignedCatalogIds={assignedCatalogIds}
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onAdded={() => void load()}
      />

      {shopId && (
        <MerchantManualProductModal
          shopId={shopId}
          open={showManual}
          onClose={() => setShowManual(false)}
          onAdded={() => void load()}
        />
      )}

      <MerchantEditProductModal
        product={editingProduct}
        open={editingProduct != null}
        onClose={() => setEditingProduct(null)}
        onSaved={() => void load()}
      />
    </div>
  )
}
