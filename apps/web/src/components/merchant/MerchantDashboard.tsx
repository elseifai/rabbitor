'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Store,
  Layers,
  Package,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Check,
  RefreshCw,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import { getMerchantShopAction, toggleShopOpenAction, toggleProductAvailabilityAction, updateProductPriceAction } from '@/actions/merchant'
import {
  DEMO_ANALYTICS,
  DEMO_CHART,
  MerchantSalesAnalytics,
  type AnalyticsMetrics,
  type ChartPoint,
} from '@/components/merchant/MerchantSalesAnalytics'
import { MerchantActiveDispatches } from '@/components/merchant/MerchantActiveDispatches'
import { MerchantInsightsBar } from '@/components/merchant/MerchantInsightsBar'
import { MerchantAddProductModal } from '@/components/merchant/MerchantAddProductModal'
import { MerchantCouponsPanel } from '@/components/merchant/MerchantCouponsPanel'

type InventoryItem = {
  id: string
  name: string
  category: string
  price: number
  stock: number
  available: boolean
}

type StockWarning = { id: string; name: string; stock: number; reason: string }

// MERCHANT DASHBOARD EXPANSION — unified command center
export function MerchantDashboard() {
  const [shopId, setShopId] = useState<string | null>(null)
  const [shopName, setShopName] = useState('Your Store')
  const [shopOpen, setShopOpen] = useState(true)
  const [avgPrepMinutes, setAvgPrepMinutes] = useState(20)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsMetrics>(DEMO_ANALYTICS)
  const [chartData, setChartData] = useState<ChartPoint[]>(DEMO_CHART)
  const [analyticsLive, setAnalyticsLive] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [hasShop, setHasShop] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'offers'>('overview')

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/merchant/health')
      const json = await res.json()
      if (json.success) {
        setStockWarnings(json.stockWarnings ?? [])
      }
    } catch {
      setStockWarnings([])
    }
  }, [])

  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      const merchantShop = await getMerchantShopAction()

      if (merchantShop) {
        setHasShop(true)
        setShopId(merchantShop.id)
        setShopName(merchantShop.name)
        setShopOpen(merchantShop.isActive)
        setAvgPrepMinutes(merchantShop.avgPrepMinutes ?? 20)
        setInventory(
          merchantShop.products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category || merchantShop.category || 'General',
            price: p.price,
            stock: p.stock,
            available: p.isAvailable,
          })),
        )

        try {
          const analyticsRes = await fetch('/api/merchant/analytics')
          const analyticsJson = await analyticsRes.json()
          if (analyticsJson.success) {
            setAnalytics(analyticsJson.metrics)
            setChartData(analyticsJson.chartData ?? [])
            setAnalyticsLive(true)
          } else {
            setAnalytics(DEMO_ANALYTICS)
            setChartData(DEMO_CHART)
            setAnalyticsLive(false)
          }
        } catch {
          setAnalytics(DEMO_ANALYTICS)
          setChartData(DEMO_CHART)
          setAnalyticsLive(false)
        }

        void loadHealth()
      } else {
        setHasShop(false)
        setShopName('Your Store')
        setInventory([])
        setAnalytics(DEMO_ANALYTICS)
        setChartData(DEMO_CHART)
        setAnalyticsLive(false)
      }
    } catch (err) {
      console.error('Dashboard sync failed:', err)
      setHasShop(false)
      setInventory([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [loadHealth])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const warningIds = new Set(stockWarnings.map((w) => w.id))

  const toggleStock = async (id: string) => {
    const item = inventory.find((i) => i.id === id)
    if (!item) return
    const next = !item.available
    setInventory((prev) =>
      prev.map((i) => (i.id === id ? { ...i, available: next } : i)),
    )

    const res = await toggleProductAvailabilityAction(id, next)
    if (!res.ok) {
      setInventory((prev) =>
        prev.map((i) => (i.id === id ? { ...i, available: !next } : i)),
      )
    } else {
      void loadHealth()
    }
  }

  const startEdit = (id: string, currentPrice: number) => {
    setEditingId(id)
    setEditPrice(currentPrice.toString())
  }

  const savePrice = async (id: string) => {
    const parsed = parseFloat(editPrice)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setEditingId(null)
      return
    }
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: parsed } : item)),
    )
    setEditingId(null)

    const res = await updateProductPriceAction(id, parsed)
    if (!res.ok) void loadData()
  }

  const toggleShopStatus = async () => {
    const next = !shopOpen
    setShopOpen(next)
    if (!shopId) return

    const res = await toggleShopOpenAction(shopId, next)
    if (!res.ok) setShopOpen(!next)
  }

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-xl pt-24 text-center text-sm font-black tracking-wider text-slate-400 animate-pulse">
        Syncing Engine Core…
      </div>
    )
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-xl bg-[#F8FAFC] pb-24 font-sans text-slate-900 antialiased shadow-2xl">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-5 shadow-[0_2px_15px_rgba(0,0,0,0.01)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-950">
              Store Command Center
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B35]">
              {shopName} · Live Sales Analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleShopStatus()}
            disabled={!hasShop}
            className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-[#FF6B35]/30 disabled:opacity-40"
            title={shopOpen ? 'Pause store' : 'Open store'}
          >
            {shopOpen ? (
              <ToggleRight className="h-5 w-5 text-green-500" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-slate-400" />
            )}
            {shopOpen ? 'Open' : 'Paused'}
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={refreshing}
            className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-slate-500 transition hover:text-[#FF6B35] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-100 bg-white px-5 py-2">
        {(['overview', 'offers'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wider ${
              activeTab === tab
                ? 'bg-[#FF6B35]/10 text-[#FF6B35]'
                : 'text-slate-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-6 p-5">
        {!hasShop && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-center">
            <p className="text-sm font-bold text-amber-900">No store registered yet</p>
            <p className="mt-1 text-xs font-medium text-amber-800">
              Complete merchant signup to start selling on Rabbit.
            </p>
            <Link
              href="/merchant/signup"
              className="mt-2 inline-block rounded-lg bg-[#FF6B35] px-4 py-1.5 text-xs font-bold text-white"
            >
              Merchant signup →
            </Link>
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            {hasShop && <MerchantInsightsBar onSuggestPause={() => void toggleShopStatus()} />}

            <MerchantSalesAnalytics
              metrics={analytics}
              chartData={chartData}
              live={analyticsLive}
            />

            {hasShop && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                  <Layers className="h-3.5 w-3.5 text-[#FF6B35]" /> Active Direct Dispatches
                </h3>
                <MerchantActiveDispatches prepMinutes={avgPrepMinutes} />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                  <Package className="h-3.5 w-3.5 text-[#FF6B35]" /> Core Operational Grid
                </h3>
                {hasShop && shopId && (
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(true)}
                    className="flex items-center gap-1 rounded-lg bg-[#FF6B35]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#FF6B35]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add product
                  </button>
                )}
              </div>

              {inventory.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm font-bold text-slate-600">No products yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {hasShop
                      ? 'Add your first product so customers can order it.'
                      : 'Complete signup first, then add products.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
                  {inventory.map((item) => {
                    const hasWarning = warningIds.has(item.id)
                    return (
                      <div
                        key={item.id}
                        className={`relative flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50/50 ${
                          hasWarning ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        {hasWarning && (
                          <span className="absolute right-14 top-2 flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-700">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Low stock
                          </span>
                        )}
                        <div className="space-y-0.5">
                          <h4
                            className={`text-xs font-extrabold tracking-tight ${
                              item.available ? 'text-slate-900' : 'text-slate-400 line-through'
                            }`}
                          >
                            {item.name}
                          </h4>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            {item.category} · stock {item.stock}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-slate-50 px-2.5 py-1">
                            {editingId === item.id ? (
                              <div className="flex w-16 items-center gap-1">
                                <span className="text-xs font-black text-slate-500">₹</span>
                                <input
                                  type="number"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full bg-transparent text-xs font-black text-slate-900 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => void savePrice(item.id)}
                                  className="text-green-600 transition hover:scale-110"
                                >
                                  <Check className="h-3.5 w-3.5 stroke-[3px]" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-800">₹{item.price}</span>
                                <button
                                  type="button"
                                  onClick={() => startEdit(item.id, item.price)}
                                  className="text-slate-400 transition hover:text-[#FF6B35]"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => void toggleStock(item.id)}
                            className="transform transition active:scale-95"
                          >
                            {item.available ? (
                              <ToggleRight className="h-7 w-7 text-[#FF6B35] fill-[#FF6B35]/10" />
                            ) : (
                              <ToggleLeft className="h-7 w-7 text-slate-300" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'offers' && hasShop && <MerchantCouponsPanel />}
      </div>

      {shopId && (
        <MerchantAddProductModal
          shopId={shopId}
          open={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          onAdded={() => void loadData()}
        />
      )}
    </div>
  )
}
