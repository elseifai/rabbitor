'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  IndianRupee,
  Loader2,
  Package,
  Store,
  TrendingDown,
  TrendingUp,
  Bike,
} from 'lucide-react'
import { AdminDateRangePicker } from '@/components/admin/AdminDateRangePicker'
import { presetToRange, type DateRangePreset } from '@/lib/admin-analytics'
import { formatCurrency, cn } from '@/lib/utils'

type AnalyticsPayload = {
  kpis: {
    gmv: { value: number; changePct: number; sparkline: number[] }
    orders: { completed: number; cancelled: number; changePct: number; sparkline: number[] }
    merchants: { online: number; offline: number; changePct: number; sparkline: number[] }
    riders: { online: number; onRoute: number; total: number; changePct: number; sparkline: number[] }
  }
  charts: {
    revenueVsOrders: { label: string; revenue: number; orders: number }[]
    categoryBreakdown: { category: string; revenue: number }[]
    heatmap: number[][]
    heatmapLabels: string[]
  }
  recentOrders: {
    id: string
    orderNumber: string
    customerName: string
    customerPhone: string
    shops: { name: string; type: string }[]
    riderStatus: { assigned: boolean; name?: string; phone?: string }
    status: string
    statusLabel: string
    progress: number
    netPayout: number
    createdAt: string
  }[]
}

type PlatformSettings = {
  globalMinCartValue: number
  multiShopRoutingFeePerLeg: number
  freeDeliveryThreshold: number
  surgePricingMultiplier: number
  platformServiceFee: number
}

const SURGE_OPTIONS = [1, 1.5, 2]

export function AdminOverviewCommandCenter() {
  const initial = presetToRange('last7')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [preset, setPreset] = useState<DateRangePreset>('last7')
  const [chartTab, setChartTab] = useState<'revenue' | 'category' | 'heatmap'>('revenue')
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    globalMinCartValue: 0,
    multiShopRoutingFeePerLeg: 25,
    freeDeliveryThreshold: 499,
    surgePricingMultiplier: 1,
    platformServiceFee: 0,
  })
  const [loading, setLoading] = useState(true)
  const [savingPlatform, setSavingPlatform] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
        interval: 'day',
      })
      const [analyticsRes, settingsRes] = await Promise.all([
        fetch(`/api/admin/analytics?${qs}`),
        fetch('/api/admin/platform-settings'),
      ])
      const analyticsJson = await analyticsRes.json()
      const settingsJson = await settingsRes.json()
      if (analyticsJson.success) setData(analyticsJson)
      if (settingsJson.success && settingsJson.data) setPlatformSettings(settingsJson.data)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  const maxHeat = useMemo(() => {
    if (!data) return 1
    return Math.max(1, ...data.charts.heatmap.flat())
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">
            Command center
          </p>
          <h2 className="text-xl font-black tracking-tight text-slate-900">Operational analytics</h2>
        </div>
        <AdminDateRangePicker
          from={from}
          to={to}
          preset={preset}
          onChange={({ from: f, to: t, preset: p }) => {
            setFrom(f)
            setTo(t)
            setPreset(p)
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={IndianRupee}
          label="Total gross revenue"
          value={formatCurrency(data.kpis.gmv.value)}
          mono
          changePct={data.kpis.gmv.changePct}
          sparkline={data.kpis.gmv.sparkline}
          color="#0C831F"
        />
        <KpiTile
          icon={Package}
          label="Completed orders"
          value={String(data.kpis.orders.completed)}
          sub={`${data.kpis.orders.cancelled} cancelled`}
          changePct={data.kpis.orders.changePct}
          sparkline={data.kpis.orders.sparkline}
          color="#FF6B35"
        />
        <KpiTile
          icon={Store}
          label="Merchant matrix"
          value={`${data.kpis.merchants.online} online`}
          sub={`${data.kpis.merchants.offline} offline`}
          changePct={data.kpis.merchants.changePct}
          sparkline={data.kpis.merchants.sparkline}
          color="#3B82F6"
        />
        <KpiTile
          icon={Bike}
          label="Rider fleet"
          value={`${data.kpis.riders.online}/${data.kpis.riders.total}`}
          sub={`${data.kpis.riders.onRoute} on active routes`}
          changePct={data.kpis.riders.changePct}
          sparkline={data.kpis.riders.sparkline}
          color="#8B5CF6"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 p-2">
          {(
            [
              ['revenue', 'Revenue vs volume'],
              ['category', 'Category breakdown'],
              ['heatmap', 'Peak hour heatmap'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setChartTab(id)}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-bold transition',
                chartTab === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-80 p-4">
          {chartTab === 'revenue' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.charts.revenueVsOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  fill="#FF6B3520"
                  stroke="#FF6B35"
                  strokeWidth={2}
                />
                <Bar yAxisId="right" dataKey="orders" fill="#0C831F" radius={[4, 4, 0, 0]} barSize={18} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'category' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data.charts.categoryBreakdown} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'heatmap' && (
            <div className="flex h-full flex-col">
              <div className="mb-2 flex justify-between text-[9px] font-bold uppercase text-slate-400">
                <span>Hour →</span>
                <span>0–23</span>
              </div>
              <div className="grid flex-1 grid-rows-7 gap-1">
                {data.charts.heatmap.map((row, dayIdx) => (
                  <div key={dayIdx} className="grid grid-cols-[2.5rem_1fr] items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">
                      {data.charts.heatmapLabels[dayIdx]}
                    </span>
                    <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                      {row.map((val, hour) => (
                        <div
                          key={hour}
                          title={`${data.charts.heatmapLabels[dayIdx]} ${hour}:00 — ${val} orders`}
                          className="aspect-square rounded-sm"
                          style={{
                            backgroundColor: `rgba(255, 107, 53, ${0.08 + (val / maxHeat) * 0.92})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Platform operational controls
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="Global min cart (₹)" type="number" value={platformSettings.globalMinCartValue}
            onChange={(v) => setPlatformSettings((s) => ({ ...s, globalMinCartValue: v }))} />
          <Field label="Multi-store fee / leg (₹)" type="number" value={platformSettings.multiShopRoutingFeePerLeg}
            onChange={(v) => setPlatformSettings((s) => ({ ...s, multiShopRoutingFeePerLeg: v }))} />
          <Field label="Free delivery above (₹)" type="number" value={platformSettings.freeDeliveryThreshold}
            onChange={(v) => setPlatformSettings((s) => ({ ...s, freeDeliveryThreshold: v }))} />
          <Field label="Platform service fee (₹)" type="number" value={platformSettings.platformServiceFee}
            onChange={(v) => setPlatformSettings((s) => ({ ...s, platformServiceFee: v }))} />
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Surge multiplier
            </span>
            <div className="mt-2 flex gap-2">
              {SURGE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPlatformSettings((s) => ({ ...s, surgePricingMultiplier: m }))}
                  className={cn(
                    'flex-1 rounded-xl border py-2 text-xs font-black',
                    platformSettings.surgePricingMultiplier === m
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 text-slate-600',
                  )}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={savingPlatform}
          onClick={async () => {
            setSavingPlatform(true)
            try {
              const res = await fetch('/api/admin/platform-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(platformSettings),
              })
              const json = await res.json()
              if (json.success) setPlatformSettings(json.data)
            } finally {
              setSavingPlatform(false)
            }
          }}
          className="mt-4 rounded-xl bg-[#FF6B35] px-5 py-2.5 text-xs font-black uppercase text-white disabled:opacity-50"
        >
          {savingPlatform ? 'Saving…' : 'Publish platform rules'}
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Live order matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Shops</th>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">Phase</th>
                <th className="px-4 py-3 text-right">Net payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No orders in selected range
                  </td>
                </tr>
              ) : (
                data.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-slate-800">
                        {o.orderNumber.slice(0, 14)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {format(new Date(o.createdAt), 'MMM d, HH:mm')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-orange-700">
                          {(o.customerName || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{o.customerName}</p>
                          <p className="font-mono text-[10px] text-slate-400">{o.customerPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {o.shops.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                          >
                            {s.name.slice(0, 12)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {o.riderStatus.assigned ? (
                        <span className="font-semibold text-[#0C831F]">{o.riderStatus.name}</span>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">{o.statusLabel}</p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            o.status === 'CANCELLED' ? 'bg-red-400' : 'bg-[#0C831F]',
                          )}
                          style={{ width: `${o.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#0C831F]">
                      {formatCurrency(o.netPayout)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  mono,
  changePct,
  sparkline,
  color,
}: {
  icon: typeof Package
  label: string
  value: string
  sub?: string
  mono?: boolean
  changePct: number
  sparkline: number[]
  color: string
}) {
  const up = changePct >= 0
  const sparkData = sparkline.map((v, i) => ({ i, v }))

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.05)]">
      <div className="absolute inset-x-0 bottom-0 h-16 opacity-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData}>
            <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="relative">
        <div className="flex items-center justify-between">
          <Icon className="h-4 w-4 text-slate-400" />
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black',
              up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(changePct)}%
          </span>
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className={cn('mt-1 text-2xl font-black tracking-tight text-slate-900', mono && 'font-mono')}>
          {value}
        </p>
        {sub && <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'number',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold shadow-sm focus:border-orange-400 focus:outline-none"
      />
    </label>
  )
}
