'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Store,
  Power,
  Package,
  ListFilter,
  IndianRupee,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  getMerchantShopAction,
  getMerchantAnalyticsAction,
  toggleShopOpenAction,
  toggleProductAvailabilityAction,
  updateProductPriceAction,
} from '@/actions/merchant'
import { formatCurrency } from '@/lib/utils'

type ShopData = NonNullable<Awaited<ReturnType<typeof getMerchantShopAction>>>
type ProductRow = ShopData['products'][number]

export function MerchantStockPanel() {
  const [shop, setShop] = useState<ShopData | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [todayOrders, setTodayOrders] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const priceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    Promise.all([getMerchantShopAction(), getMerchantAnalyticsAction()])
      .then(([shopData, analytics]) => {
        if (!shopData) {
          setError('No shop found for this merchant account.')
          return
        }
        setShop(shopData)
        setProducts(shopData.products)
        if (analytics) {
          setTodayOrders(analytics.todayOrders)
          setTodayRevenue(analytics.todayRevenue)
        }
      })
      .catch(() => {
        setError('Could not load merchant inventory.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const toggleStoreOpen = async () => {
    if (!shop) return
    const next = !shop.isActive
    setShop({ ...shop, isActive: next })
    const res = await toggleShopOpenAction(shop.id, next)
    if (!res.ok) setShop({ ...shop, isActive: !next })
  }

  const toggleAvailability = async (productId: string) => {
    if (!shop) return
    const item = products.find((p) => p.id === productId)
    if (!item) return
    const next = !item.isAvailable
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: next } : p)),
    )
    const res = await toggleProductAvailabilityAction(productId, next)
    if (!res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: !next } : p)),
      )
    }
  }

  const handlePriceChange = (productId: string, raw: string) => {
    const parsed = parseFloat(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, price: parsed } : p)),
    )

    if (!shop) return

    if (priceTimers.current[productId]) clearTimeout(priceTimers.current[productId])
    priceTimers.current[productId] = setTimeout(async () => {
      const res = await updateProductPriceAction(productId, parsed)
      if (!res.ok) {
        const fresh = await getMerchantShopAction()
        if (fresh) setProducts(fresh.products)
      }
    }, 600)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading inventory…
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <p className="text-sm text-gray-600">{error ?? 'Shop not found.'}</p>
        <Link
          href="/merchant/login"
          className="mt-4 text-sm font-semibold text-orange-600 underline"
        >
          Log in as merchant
        </Link>
      </div>
    )
  }

  const visibleProducts = showAvailableOnly
    ? products.filter((p) => p.isAvailable)
    : products
  const activeCount = products.filter((p) => p.isAvailable).length

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans">
      <div className="sticky top-0 z-30 bg-slate-900 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-orange-600 p-2">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wide">{shop.name}</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Merchant Console
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void toggleStoreOpen()}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              shop.isActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {shop.isActive ? 'OPEN' : 'CLOSED'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-6 px-4 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Active Items
            </p>
            <p className="mt-1 text-2xl font-black text-gray-800">
              {activeCount}{' '}
              <span className="text-xs font-normal text-gray-400">/ {products.length}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Today&apos;s Orders
            </p>
            <p className="mt-1 text-2xl font-black text-orange-600">
              {todayOrders}{' '}
              <span className="ml-1 rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-bold text-green-600">
                {formatCurrency(todayRevenue)}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
              <Package className="h-4 w-4 text-orange-600" /> Catalog Inventory
            </h2>
            <button
              type="button"
              onClick={() => setShowAvailableOnly((v) => !v)}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold shadow-sm ${
                showAvailableOnly
                  ? 'border-orange-200 bg-orange-50 text-orange-600'
                  : 'border-gray-100 bg-white text-orange-600'
              }`}
            >
              <ListFilter className="h-3 w-3" />{' '}
              {showAvailableOnly ? 'In stock only' : 'Filter'}
            </button>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
              <p className="text-sm text-gray-500">No products yet.</p>
              <Link
                href="/merchant/products"
                className="mt-2 inline-block text-sm font-semibold text-orange-600"
              >
                Add your first product →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleProducts.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition ${
                    item.isAvailable
                      ? 'border-gray-100'
                      : 'border-gray-200 bg-gray-50/50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-600">
                        {shop.category}
                      </span>
                      <h3 className="mt-1 text-sm font-bold text-gray-800">{item.name}</h3>
                      <p className="text-xs font-medium text-gray-400">
                        Selling Unit: {item.unit}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void toggleAvailability(item.id)}
                      className={`rounded-xl p-2 transition ${
                        item.isAvailable
                          ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                      title={item.isAvailable ? 'Set out of stock' : 'Set in stock'}
                    >
                      {item.isAvailable ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Price
                      </span>
                      <div className="relative flex items-center">
                        <IndianRupee className="absolute left-2 h-3.5 w-3.5 text-gray-500" />
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          className="w-24 rounded-lg border border-gray-200 bg-gray-50 py-1 pl-6 pr-2 text-sm font-extrabold text-gray-800 transition focus:border-orange-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${
                        item.isAvailable
                          ? 'bg-green-50 text-green-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {item.isAvailable ? '● Active in App' : '○ Hidden'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/merchant/orders"
            className="rounded-xl border border-gray-200 bg-white py-3 text-center text-sm font-bold text-gray-700 shadow-sm"
          >
            Live Orders →
          </Link>
          <Link
            href="/merchant/products"
            className="rounded-xl border border-orange-200 bg-orange-50 py-3 text-center text-sm font-bold text-orange-700 shadow-sm"
          >
            Add Product →
          </Link>
        </div>
      </div>
    </div>
  )
}
