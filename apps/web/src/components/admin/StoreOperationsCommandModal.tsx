'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  IndianRupee,
  Loader2,
  Package,
  Star,
  TrendingUp,
  X,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { tierMeta, type StorePerformanceTier } from '@/lib/store-performance'

type StoreDetail = {
  shop: {
    id: string
    name: string
    storeType: string
    address: string
    isActive: boolean
    ratingAvg: number
    ratingCount: number
    performanceTier: StorePerformanceTier
    handoverMin: number
    fulfillmentRate: number
  }
  telemetry: {
    dailySeries: { date: string; revenue: number; orders: number }[]
    prepDelaySeries: number[]
    ratingDistribution: { stars: number; pct: number }[]
  }
  catalog: {
    id: string
    name: string
    price: number
    stock: number
    isAvailable: boolean
    image: string | null
    category: string
  }[]
  topProducts: {
    id: string
    name: string
    image: string | null
    category: string
    units: number
    revenue: number
    categoryShare: number
  }[]
  financials: {
    commissionRate: number
    totalGmv: number
    platformCommission: number
    outstandingPayout: number
    bankAccountRef: string | null
    ifscCode: string | null
    businessName: string
    payoutHistory: { id: string; orderNumber: string; gross: number; net: number; date: string }[]
  }
}

const TABS = [
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'catalog', label: 'Catalog & Stock' },
  { id: 'top', label: 'Top Sellers' },
  { id: 'financials', label: 'Margins & Payouts' },
] as const

type TabId = (typeof TABS)[number]['id']

export function StoreOperationsCommandModal({
  storeId,
  storeName,
  open,
  onClose,
}: {
  storeId: string | null
  storeName: string
  open: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<TabId>('telemetry')
  const [data, setData] = useState<StoreDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingProduct, setSavingProduct] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stores/${storeId}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    if (open && storeId) {
      setTab('telemetry')
      void load()
    }
  }, [open, storeId, load])

  const patchProduct = async (
    productId: string,
    patch: { stock?: number; price?: number; isAvailable?: boolean },
  ) => {
    if (!storeId) return
    setSavingProduct(productId)
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (json.success && data) {
        setData({
          ...data,
          catalog: data.catalog.map((p) =>
            p.id === productId ? { ...p, ...patch } : p,
          ),
        })
      }
    } finally {
      setSavingProduct(null)
    }
  }

  if (!open || !storeId) return null

  const tier = data ? tierMeta(data.shop.performanceTier) : null
  const prepChart = (data?.telemetry.prepDelaySeries ?? []).map((v, i) => ({
    idx: `#${i + 1}`,
    minutes: v,
  }))

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[88vh] sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between border-b bg-slate-900 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Store Operations Command Master
            </p>
            <h2 className="mt-1 text-xl font-black">{storeName}</h2>
            {data && tier && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1', tier.className)}>
                  {tier.label}
                </span>
                <span className="text-xs text-slate-300">
                  ⚡ {data.shop.handoverMin}m handover · {data.shop.fulfillmentRate}% fulfillment · ★{' '}
                  {data.shop.ratingAvg.toFixed(1)} ({data.shop.ratingCount})
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b bg-slate-50 px-4 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide transition',
                tab === t.id
                  ? 'bg-[#FF6B35] text-white shadow'
                  : 'text-slate-500 hover:bg-white hover:text-slate-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
            </div>
          )}

          {!loading && data && tab === 'telemetry' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-white p-4">
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                  <p className="mt-2 text-[10px] font-bold uppercase text-slate-400">14-day revenue</p>
                  <p className="text-2xl font-black text-emerald-700">
                    {formatCurrency(data.telemetry.dailySeries.reduce((s, d) => s + d.revenue, 0))}
                  </p>
                </div>
                <div className="rounded-2xl border bg-gradient-to-br from-orange-50 to-white p-4">
                  <Activity className="h-5 w-5 text-orange-600" />
                  <p className="mt-2 text-[10px] font-bold uppercase text-slate-400">Order spikes</p>
                  <p className="text-2xl font-black text-orange-700">
                    {Math.max(...data.telemetry.dailySeries.map((d) => d.orders), 0)} peak/day
                  </p>
                </div>
                <div className="rounded-2xl border bg-gradient-to-br from-sky-50 to-white p-4">
                  <TrendingUp className="h-5 w-5 text-sky-600" />
                  <p className="mt-2 text-[10px] font-bold uppercase text-slate-400">Avg prep delay</p>
                  <p className="text-2xl font-black text-sky-700">
                    {prepChart.length
                      ? Math.round(prepChart.reduce((s, p) => s + p.minutes, 0) / prepChart.length)
                      : 0}
                    m
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="mb-3 text-xs font-black uppercase text-slate-400">Daily revenue & order volume</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.telemetry.dailySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#0C831F"
                        fill="#0C831F"
                        fillOpacity={0.15}
                        name="Revenue ₹"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="orders"
                        stroke="#FF6B35"
                        fill="#FF6B35"
                        fillOpacity={0.1}
                        name="Orders"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="mb-3 text-xs font-black uppercase text-slate-400">Preparation delay history</p>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepChart.slice(-14)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="idx" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="m" />
                        <Tooltip />
                        <Bar dataKey="minutes" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Minutes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="mb-3 text-xs font-black uppercase text-slate-400">Customer rating distribution</p>
                  <div className="space-y-2">
                    {data.telemetry.ratingDistribution.map((r) => (
                      <div key={r.stars} className="flex items-center gap-2">
                        <span className="flex w-8 items-center gap-0.5 text-xs font-bold text-amber-500">
                          {r.stars}
                          <Star className="h-3 w-3 fill-amber-400" />
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[10px] font-bold text-slate-400">{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && data && tab === 'catalog' && (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-white">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Price override</th>
                    <th className="px-4 py-3">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.catalog.map((p) => (
                    <tr key={p.id} className="hover:bg-orange-50/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                              <Package className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900">{p.name}</p>
                            <p className="text-[10px] uppercase text-gray-400">{p.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          defaultValue={p.stock}
                          disabled={savingProduct === p.id}
                          onBlur={(e) => {
                            const v = Number(e.target.value)
                            if (v !== p.stock) void patchProduct(p.id, { stock: v })
                          }}
                          className="w-20 rounded-lg border px-2 py-1 text-sm font-bold"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          defaultValue={p.price}
                          disabled={savingProduct === p.id}
                          onBlur={(e) => {
                            const v = Number(e.target.value)
                            if (v !== p.price) void patchProduct(p.id, { price: v })
                          }}
                          className="w-24 rounded-lg border px-2 py-1 text-sm font-bold"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={savingProduct === p.id}
                          onClick={() => void patchProduct(p.id, { isAvailable: !p.isAvailable })}
                          className={cn(
                            'rounded-full px-3 py-1 text-[10px] font-black uppercase',
                            p.isAvailable
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700',
                          )}
                        >
                          {p.isAvailable ? 'Live' : 'Off'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data.catalog.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                        No products assigned to this store.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && data && tab === 'top' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.topProducts.map((p, i) => (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl border bg-gradient-to-br from-white to-slate-50 shadow-sm"
                >
                  <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 text-white">
                    <span className="text-lg font-black text-[#FF6B35]">#{i + 1}</span>
                    <span className="truncate text-sm font-bold">{p.name}</span>
                  </div>
                  <div className="p-4">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="mb-3 h-24 w-full rounded-xl object-cover" />
                    ) : (
                      <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-slate-100">
                        <Package className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl bg-orange-50 p-2">
                        <p className="text-[9px] font-bold uppercase text-orange-600">Units</p>
                        <p className="text-lg font-black text-orange-800">{p.units}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-2">
                        <p className="text-[9px] font-bold uppercase text-emerald-600">Revenue</p>
                        <p className="text-lg font-black text-emerald-800">{formatCurrency(p.revenue)}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-[10px] font-bold uppercase text-slate-400">
                      {p.category} · {p.categoryShare}% category share
                    </p>
                  </div>
                </div>
              ))}
              {data.topProducts.length === 0 && (
                <p className="col-span-full py-12 text-center text-sm text-gray-400">
                  No delivered orders in the last 30 days.
                </p>
              )}
            </div>
          )}

          {!loading && data && tab === 'financials' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase text-emerald-600">Total GMV (recent)</p>
                  <p className="mt-1 text-2xl font-black text-emerald-800">
                    {formatCurrency(data.financials.totalGmv)}
                  </p>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase text-orange-600">
                    Platform commission ({Math.round(data.financials.commissionRate * 100)}%)
                  </p>
                  <p className="mt-1 text-2xl font-black text-orange-800">
                    {formatCurrency(data.financials.platformCommission)}
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase text-sky-600">Outstanding payout</p>
                  <p className="mt-1 text-2xl font-black text-sky-800">
                    {formatCurrency(data.financials.outstandingPayout)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-xs font-black uppercase text-slate-400">Merchant bank details</p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Business</p>
                    <p className="font-bold">{data.financials.businessName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Account ref</p>
                    <p className="font-mono font-bold">{data.financials.bankAccountRef ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">IFSC</p>
                    <p className="font-mono font-bold">{data.financials.ifscCode ?? '—'}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-white">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Gross</th>
                      <th className="px-4 py-3">Net payout</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.financials.payoutHistory.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs">{row.orderNumber}</td>
                        <td className="px-4 py-2 font-bold">{formatCurrency(row.gross)}</td>
                        <td className="px-4 py-2 font-bold text-emerald-700">{formatCurrency(row.net)}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {new Date(row.date).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
