'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Barcode,
  Loader2,
  Package,
  PackageX,
  Plus,
  ScanLine,
  Search,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import {
  adjustStockAction,
  deleteInventoryProductAction,
  getInventoryAction,
  getInventoryStatsAction,
  lookupByBarcodeAction,
} from '@/actions/inventory'
import { formatCurrency } from '@/lib/utils'
import { BarcodeScannerModal } from './BarcodeScannerModal'
import { ProductEditorDrawer, type ProductEditorState } from './ProductEditorDrawer'

type InventoryData = NonNullable<Awaited<ReturnType<typeof getInventoryAction>>>
type Stats = NonNullable<Awaited<ReturnType<typeof getInventoryStatsAction>>>
type ProductRow = InventoryData['products'][number]

function mapVariants(
  variants: ProductRow['variants'],
): ProductEditorState['variants'] {
  return variants.map((v) => ({
    id: v.id,
    name: v.name,
    sku: v.sku ?? undefined,
    barcode: v.barcode ?? undefined,
    price: v.price,
    mrp: v.mrp ?? undefined,
    stock: v.stock,
    isAvailable: v.isAvailable,
  }))
}

const EMPTY_PRODUCT = (barcode?: string): ProductEditorState => ({
  name: '',
  price: 0,
  unit: 'piece',
  stock: 0,
  lowStockThreshold: 5,
  barcode: barcode ?? '',
  isAvailable: true,
  variants: [],
})

export function MerchantInventoryClient() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [data, setData] = useState<InventoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorInitial, setEditorInitial] = useState<ProductEditorState | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [s, inv] = await Promise.all([
      getInventoryStatsAction(),
      getInventoryAction({ search, filter }),
    ])
    setStats(s)
    setData(inv)
    setLoading(false)
  }, [search, filter])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = (barcode?: string) => {
    setEditorInitial(EMPTY_PRODUCT(barcode))
    setEditorOpen(true)
  }

  const openEdit = (row: ProductRow) => {
    setEditorInitial({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      price: row.price,
      mrp: row.mrp ?? undefined,
      unit: row.unit,
      stock: row.stock,
      sku: row.sku ?? undefined,
      barcode: row.barcode ?? undefined,
      brand: row.brand ?? undefined,
      productCategory: row.productCategory ?? undefined,
      costPrice: row.costPrice ?? undefined,
      lowStockThreshold: row.lowStockThreshold,
      taxRate: row.taxRate ?? undefined,
      hsnCode: row.hsnCode ?? undefined,
      imageUrl: row.image ?? undefined,
      isAvailable: row.isAvailable,
      variants: mapVariants(row.variants),
    })
    setEditorOpen(true)
  }

  const onBarcodeScanned = async (code: string) => {
    setToast(null)
    const res = await lookupByBarcodeAction(code)
    if (!res.ok) {
      setToast(res.error)
      return
    }
    if (res.found) {
      setEditorInitial({
        id: res.product.id,
        name: res.product.name,
        description: res.product.description ?? undefined,
        price: res.product.price,
        mrp: res.product.mrp ?? undefined,
        unit: res.product.unit,
        stock: res.product.stock,
        sku: res.product.sku ?? undefined,
        barcode: res.product.barcode ?? undefined,
        brand: res.product.brand ?? undefined,
        productCategory: res.product.productCategory ?? undefined,
        costPrice: res.product.costPrice ?? undefined,
        lowStockThreshold: res.product.lowStockThreshold,
        taxRate: res.product.taxRate ?? undefined,
        hsnCode: res.product.hsnCode ?? undefined,
        imageUrl: res.product.image ?? undefined,
        isAvailable: res.product.isAvailable,
        variants: mapVariants(res.product.variants),
        matchedVariantId: res.product.matchedVariantId,
      })
      setEditorOpen(true)
      setToast(`Found: ${res.product.name}`)
    } else {
      openCreate(code)
      setToast(`New product — barcode ${code} added`)
    }
  }

  const quickAdjust = async (row: ProductRow, delta: number) => {
    setBusyId(row.id)
    const res = await adjustStockAction({
      productId: row.id,
      delta,
      type: delta > 0 ? 'RESTOCK' : 'CORRECTION',
      reference: row.barcode ?? undefined,
    })
    setBusyId(null)
    if (!res.ok) setToast(res.error ?? 'Could not adjust stock')
    else void load()
  }

  const removeProduct = async (row: ProductRow) => {
    if (!confirm(`Remove "${row.name}" from inventory?`)) return
    setBusyId(row.id)
    const res = await deleteInventoryProductAction(row.id)
    setBusyId(null)
    if (!res.ok) setToast(res.error ?? 'Could not delete')
    else void load()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-rabbit-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <p className="text-gray-600">No shop linked to this account.</p>
        <Link href="/merchant/login" className="mt-3 inline-block text-rabbit-600">
          Merchant login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-xl bg-rabbit-50 px-4 py-2 text-sm text-rabbit-800">{toast}</div>
      )}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Package}
            label="Total products"
            value={String(stats.totalProducts)}
            sub={stats.totalVariants > 0 ? `${stats.totalVariants} variants` : undefined}
          />
          <StatCard
            icon={AlertTriangle}
            label="Low stock"
            value={String(stats.lowStock)}
            tone="amber"
          />
          <StatCard icon={PackageX} label="Out of stock" value={String(stats.outOfStock)} tone="red" />
          <StatCard
            icon={TrendingUp}
            label="Inventory value"
            value={formatCurrency(stats.inventoryValue)}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, barcode, brand…"
            className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'low', 'out'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                filter === f
                  ? 'bg-rabbit-600 text-white'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'low' ? 'Low stock' : 'Out of stock'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <ScanLine className="h-4 w-4" />
            Scan
          </button>
          <button
            type="button"
            onClick={() => openCreate()}
            className="flex items-center gap-2 rounded-xl bg-rabbit-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                    No products match. Scan a barcode or add manually.
                  </td>
                </tr>
              ) : (
                data.products.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="text-left font-medium text-gray-900 hover:text-rabbit-700"
                      >
                        {row.name}
                      </button>
                      {row.brand && (
                        <p className="text-xs text-gray-500">{row.brand}</p>
                      )}
                      {row.variantCount > 0 && (
                        <p className="text-xs text-rabbit-600">
                          {row.variantCount} variant{row.variantCount > 1 ? 's' : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {row.sku && <div>SKU: {row.sku}</div>}
                      {row.barcode && (
                        <div className="flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          {row.barcode}
                        </div>
                      )}
                      {!row.sku && !row.barcode && '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.productCategory ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge status={row.stockStatus} qty={row.stock} />
                      {!row.variantCount && (
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void quickAdjust(row, -1)}
                            className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void quickAdjust(row, 1)}
                            className="rounded bg-rabbit-100 px-2 py-0.5 text-xs font-bold text-rabbit-700"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(row.price)}
                      </div>
                      {row.mrp && row.mrp > row.price && (
                        <div className="text-xs text-gray-400 line-through">
                          {formatCurrency(row.mrp)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.isAvailable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {row.isAvailable ? 'Live' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-xs font-semibold text-rabbit-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void removeProduct(row)}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => void onBarcodeScanned(code)}
      />

      <ProductEditorDrawer
        open={editorOpen}
        initial={editorInitial}
        onClose={() => setEditorOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  tone?: 'amber' | 'red'
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'red'
        ? 'border-red-200 bg-red-50'
        : 'border-gray-200 bg-white'

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function StockBadge({
  status,
  qty,
}: {
  status: 'ok' | 'low' | 'out'
  qty: number
}) {
  const styles = {
    ok: 'bg-green-100 text-green-800',
    low: 'bg-amber-100 text-amber-800',
    out: 'bg-red-100 text-red-800',
  }
  const labels = { ok: 'In stock', low: 'Low', out: 'Out' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${styles[status]}`}>
      {labels[status]} · {qty}
    </span>
  )
}
