'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  RefreshCw,
  BarChart3,
  Store,
  ShoppingBag,
  Activity,
  ArrowUpRight,
  PlusCircle,
} from 'lucide-react'

type PlatformMetrics = {
  totalGTV: number
  activeOrders: number
  shopCount: number
  productCount: number
}

type RecentOrder = {
  id: string
  orderNumber: string
  shopName: string
  status: string
  statusLabel: string
  grandTotal: number
  createdAt: string
}

const DEMO_METRICS: PlatformMetrics = {
  totalGTV: 18420,
  activeOrders: 7,
  shopCount: 4,
  productCount: 14,
}

const DEMO_ORDERS: RecentOrder[] = [
  {
    id: 'demo-order-1',
    orderNumber: 'RBT-DEMO1',
    shopName: 'Coastal Fresh Fish',
    status: 'PREPARING',
    statusLabel: 'Items being packed',
    grandTotal: 865,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-order-2',
    orderNumber: 'RBT-DEMO2',
    shopName: 'Sharma Kirana Store',
    status: 'PENDING',
    statusLabel: 'Order placed',
    grandTotal: 320,
    createdAt: new Date().toISOString(),
  },
]

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics>(DEMO_METRICS)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>(DEMO_ORDERS)
  const [systemOk, setSystemOk] = useState(true)
  const [live, setLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPlatformData = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/metrics')
      const json = await res.json()
      if (json.success) {
        setMetrics(json.metrics)
        setRecentOrders(json.recentOrders ?? [])
        setSystemOk(json.systemHealth?.status === 'operational')
        setLive(true)
      } else {
        setMetrics(DEMO_METRICS)
        setRecentOrders(DEMO_ORDERS)
        setSystemOk(false)
        setLive(false)
      }
    } catch (err) {
      console.error('Failed syncing admin core infrastructure:', err)
      setMetrics(DEMO_METRICS)
      setRecentOrders(DEMO_ORDERS)
      setLive(false)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchPlatformData()
  }, [fetchPlatformData])

  if (loading) {
    return (
      <div className="pt-24 text-center text-sm font-black tracking-widest text-slate-400 animate-pulse">
        Loading Platform Matrix...
      </div>
    )
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-xl bg-[#F8FAFC] pb-24 font-sans text-slate-900 antialiased shadow-2xl">
      <div className="sticky top-0 z-40 flex items-center justify-between bg-slate-950 px-5 py-5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6B35] text-sm font-black text-white">
            👑
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight">Network Control</h1>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Super-Admin Authorization
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchPlatformData()}
          disabled={refreshing}
          className="rounded-xl bg-white/10 p-2 text-white/70 transition hover:text-[#FF6B35] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-6 p-5">
        {!live && (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">
            Demo mode —{' '}
            <Link href="/admin/login" className="font-bold text-[#FF6B35] underline">
              log in as admin
            </Link>{' '}
            (9111111111) for live platform data.
          </p>
        )}

        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-bold ${
            systemOk
              ? 'border-amber-100 bg-amber-50 text-amber-900'
              : 'border-red-100 bg-red-50 text-red-900'
          }`}
        >
          <ShieldAlert
            className={`h-5 w-5 shrink-0 ${systemOk ? 'text-amber-600' : 'text-red-600'}`}
          />
          <div className="leading-tight">
            <span>{systemOk ? 'System Pulse Normal.' : 'System Pulse Degraded.'}</span>
            <p
              className={`text-[10px] font-medium ${systemOk ? 'text-amber-600' : 'text-red-600'}`}
            >
              {systemOk
                ? 'All database microservices responding inside 45ms limits.'
                : 'Admin API unreachable or platform data incomplete.'}
            </p>
          </div>
        </div>

        <Link
          href="/admin/new-store"
          className="flex items-center justify-between rounded-2xl border border-[#FF6B35]/20 bg-gradient-to-r from-[#FFF8F5] to-white p-4 shadow-sm transition hover:border-[#FF6B35]/40"
        >
          <div>
            <p className="text-xs font-black text-slate-900">Onboard New Vendor</p>
            <p className="text-[10px] font-semibold text-slate-500">
              Add a shop to the discovery feed instantly
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35] text-white">
            <PlusCircle className="h-5 w-5" />
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
            <Activity className="mb-2 h-4 w-4 text-[#FF6B35]" />
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Platform GTV
            </span>
            <span className="text-xl font-black text-slate-900">
              ₹{metrics.totalGTV.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
            <ShoppingBag className="mb-2 h-4 w-4 text-emerald-500" />
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Active Dispatches
            </span>
            <span className="text-xl font-black text-slate-900">{metrics.activeOrders}</span>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
            <Store className="mb-2 h-4 w-4 text-blue-500" />
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Live Vendors
            </span>
            <span className="text-xl font-black text-slate-900">{metrics.shopCount}</span>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
            <BarChart3 className="mb-2 h-4 w-4 text-purple-500" />
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              SKU Items Listed
            </span>
            <span className="text-xl font-black text-slate-900">{metrics.productCount}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Global Order Stream
          </h3>

          <div className="divide-y divide-slate-50 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            {recentOrders.length === 0 ? (
              <p className="p-6 text-center text-xs font-semibold text-slate-400">
                No orders flowing through the network infrastructure yet.
              </p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={order.id.startsWith('demo') ? '#' : `/track/${order.id}`}
                  className="group flex items-center justify-between p-4 transition hover:bg-slate-50/50"
                >
                  <div className="max-w-[70%] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-black text-slate-900">
                        #{order.id.slice(0, 8)}…
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                        {order.statusLabel ?? order.status}
                      </span>
                    </div>
                    <p className="truncate text-[11px] font-semibold text-slate-400">
                      Store: {order.shopName || 'Unknown'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <span className="block text-xs font-black text-slate-900">
                        ₹{order.grandTotal}
                      </span>
                      <span className="block font-mono text-[8px] text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-[#FF6B35]" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
