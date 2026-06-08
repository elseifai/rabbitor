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
} from 'lucide-react'
import { getMerchantOrdersAction } from '@/actions/orders'
import { getMerchantShopAction, toggleShopOpenAction } from '@/actions/merchant'
import {
  DEMO_ANALYTICS,
  DEMO_CHART,
  MerchantSalesAnalytics,
  type AnalyticsMetrics,
  type ChartPoint,
} from '@/components/merchant/MerchantSalesAnalytics'
import type { OrderStatus } from '@rabbit/database'

type InventoryItem = {
  id: string
  name: string
  category: string
  price: number
  available: boolean
}

type OrderRow = {
  id: string
  orderNumber: string
  items: string
  total: number
  status: string
  rawStatus: OrderStatus
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'ACCEPTED_BY_SHOP',
  ACCEPTED_BY_SHOP: 'PREPARING',
  PREPARING: 'OUT_FOR_DELIVERY',
}

const ACCEPT_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Accept →',
  ACCEPTED_BY_SHOP: 'Start packing →',
  PREPARING: 'Dispatch rider →',
}

function statusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PENDING: 'Pending',
    ACCEPTED_BY_SHOP: 'Accepted',
    PREPARING: 'Packing items',
    OUT_FOR_DELIVERY: 'Out for delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  }
  return map[status] ?? status
}

export function MerchantDashboard() {
  const [shopId, setShopId] = useState<string | null>(null)
  const [shopName, setShopName] = useState('Royal Coastal Seafood')
  const [shopOpen, setShopOpen] = useState(true)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsMetrics>(DEMO_ANALYTICS)
  const [chartData, setChartData] = useState<ChartPoint[]>(DEMO_CHART)
  const [analyticsLive, setAnalyticsLive] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [hasShop, setHasShop] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      // Source the vendor's OWN shop + products (scoped to their session)
      const merchantShop = await getMerchantShopAction()

      if (merchantShop) {
        // Real, logged-in vendor — show their data (may be empty)
        setIsLive(true)
        setHasShop(true)
        setShopId(merchantShop.id)
        setShopName(merchantShop.name)
        setShopOpen(merchantShop.isActive)
        setInventory(
          merchantShop.products.map((p) => ({
            id: p.id,
            name: p.name,
            category: merchantShop.category ?? 'General',
            price: p.price,
            available: p.isAvailable,
          })),
        )

        try {
          const orderData = await getMerchantOrdersAction()
          setOrders(
            (orderData ?? [])
              .filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status))
              .slice(0, 10)
              .map((o) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                items: `${o.itemCount} item${o.itemCount === 1 ? '' : 's'}`,
                total: Math.round(o.totalPrice),
                status: statusLabel(o.status),
                rawStatus: o.status,
              })),
          )
        } catch {
          setOrders([])
        }

        // Live analytics for this vendor
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
      } else {
        // Logged-in user with no shop yet — show real empty/onboarding state
        setIsLive(false)
        setHasShop(false)
        setShopName('Your Store')
        setInventory([])
        setOrders([])
        setAnalytics(DEMO_ANALYTICS)
        setChartData(DEMO_CHART)
        setAnalyticsLive(false)
      }
    } catch (err) {
      console.error('Dashboard sync failed:', err)
      setIsLive(false)
      setHasShop(false)
      setInventory([])
      setOrders([])
      setAnalytics(DEMO_ANALYTICS)
      setChartData(DEMO_CHART)
      setAnalyticsLive(false)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const toggleStock = async (id: string) => {
    const item = inventory.find((i) => i.id === id)
    if (!item) return
    const next = !item.available
    setInventory((prev) =>
      prev.map((i) => (i.id === id ? { ...i, available: next } : i)),
    )
    if (!isLive) return

    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: next }),
    })
    const json = await res.json()
    if (!json.success) {
      setInventory((prev) =>
        prev.map((i) => (i.id === id ? { ...i, available: !next } : i)),
      )
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
    if (!isLive) return

    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: parsed }),
    })
    const json = await res.json()
    if (!json.success) void loadData()
  }

  const toggleShopStatus = async () => {
    const next = !shopOpen
    setShopOpen(next)
    if (!isLive || !shopId) return

    const res = await toggleShopOpenAction(shopId, next)
    if (!res.ok) setShopOpen(!next)
  }

  const acceptOrder = async (order: OrderRow) => {
    if (!isLive || order.id.startsWith('demo-')) return
    const nextStatus = NEXT_STATUS[order.rawStatus]
    if (!nextStatus) return

    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    const json = await res.json()
    if (json.success) void loadData()
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
            className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-[#FF6B35]/30"
            title={shopOpen ? 'Close shop' : 'Open shop'}
          >
            {shopOpen ? (
              <ToggleRight className="h-5 w-5 text-green-500" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-slate-400" />
            )}
            {shopOpen ? 'Open' : 'Closed'}
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

      <div className="space-y-6 p-5">
        {!hasShop && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-center">
            <p className="text-sm font-bold text-amber-900">No store set up yet</p>
            <p className="mt-1 text-xs font-medium text-amber-800">
              Complete onboarding to start selling on Rabbit.
            </p>
            <Link
              href="/merchant/onboarding"
              className="mt-2 inline-block rounded-lg bg-[#FF6B35] px-4 py-1.5 text-xs font-bold text-white"
            >
              Set up my store →
            </Link>
          </div>
        )}

        <MerchantSalesAnalytics
          metrics={analytics}
          chartData={chartData}
          live={analyticsLive}
        />

        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
            <Layers className="h-3.5 w-3.5 text-[#FF6B35]" /> Active Direct Dispatches
          </h3>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-xs font-medium text-slate-400">
                No active orders right now.
              </p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="group flex items-center justify-between rounded-2xl border border-[#FF6B35]/10 bg-white p-4 shadow-sm"
                >
                  <div className="max-w-[70%] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        Order #{order.orderNumber}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          order.status === 'Pending'
                            ? 'border-amber-100 bg-amber-50 text-amber-600'
                            : 'border-blue-100 bg-blue-50 text-blue-600'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="truncate text-xs font-semibold text-slate-500">{order.items}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-black text-slate-900">₹{order.total}</span>
                    {NEXT_STATUS[order.rawStatus] && (
                      <button
                        type="button"
                        onClick={() => void acceptOrder(order)}
                        className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#FF6B35] hover:underline"
                      >
                        {ACCEPT_LABEL[order.rawStatus] ?? 'Update →'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
            <Package className="h-3.5 w-3.5 text-[#FF6B35]" /> Core Operational Grid
          </h3>

          {inventory.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-bold text-slate-600">No products yet</p>
              <p className="mt-1 text-xs text-slate-400">
                {hasShop
                  ? 'Add your first product so customers can order it.'
                  : 'Set up your store first, then add products.'}
              </p>
              {hasShop && (
                <Link
                  href="/merchant/products"
                  className="mt-3 inline-block rounded-lg bg-[#FF6B35] px-4 py-1.5 text-xs font-bold text-white"
                >
                  Add product →
                </Link>
              )}
            </div>
          ) : (
          <div className="divide-y divide-slate-50 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            {inventory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50/50"
              >
                <div className="space-y-0.5">
                  <h4
                    className={`text-xs font-extrabold tracking-tight ${
                      item.available ? 'text-slate-900' : 'text-slate-400 line-through'
                    }`}
                  >
                    {item.name}
                  </h4>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {item.category}
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
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
