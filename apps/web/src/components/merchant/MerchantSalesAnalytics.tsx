'use client'

import { BarChart3, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react'

export type AnalyticsMetrics = {
  totalRevenue: number
  totalOrders: number
  aov: number
}

export type ChartPoint = {
  grandTotal: number
  createdAt?: string
  label?: string
}

export const DEMO_ANALYTICS: AnalyticsMetrics = {
  totalRevenue: 4280,
  totalOrders: 12,
  aov: 357,
}

export const DEMO_CHART: ChartPoint[] = [
  { grandTotal: 290, label: '1' },
  { grandTotal: 520, label: '2' },
  { grandTotal: 780, label: '3' },
  { grandTotal: 640, label: '4' },
  { grandTotal: 1250, label: '5' },
]

export function MerchantSalesAnalytics({
  metrics,
  chartData,
  live,
}: {
  metrics: AnalyticsMetrics
  chartData: ChartPoint[]
  live: boolean
}) {
  const maxOrderValue =
    chartData.length > 0 ? Math.max(...chartData.map((o) => o.grandTotal)) : 100

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core financial analytics
        </p>
        {live ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">
            ● Live from database
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
            Demo preview
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <DollarSign className="h-4 w-4 text-[#FF6B35]" />
          <div className="mt-4">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Revenue
            </span>
            <span className="text-base font-black text-slate-900">
              ₹{metrics.totalRevenue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <ShoppingBag className="h-4 w-4 text-emerald-500" />
          <div className="mt-4">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Orders
            </span>
            <span className="text-base font-black text-slate-900">{metrics.totalOrders}</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <div className="mt-4">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Avg Order
            </span>
            <span className="text-base font-black text-slate-900">₹{metrics.aov}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-[#FF6B35]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Recent Revenue Influx
          </h3>
        </div>

        {chartData.length === 0 ? (
          <p className="py-6 text-center text-xs font-semibold text-slate-400">
            Complete orders to populate metrics graphs.
          </p>
        ) : (
          <div className="flex h-28 items-end justify-between border-b border-slate-100 px-2 pt-4">
            {chartData.map((order, idx) => {
              const relativeHeight = Math.max(8, (order.grandTotal / maxOrderValue) * 100)
              return (
                <div key={idx} className="group relative flex flex-1 flex-col items-center">
                  <div className="absolute -top-7 rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition duration-200 group-hover:opacity-100">
                    ₹{order.grandTotal}
                  </div>
                  <div
                    style={{ height: `${relativeHeight}%` }}
                    className="w-6 cursor-pointer rounded-t-md bg-gradient-to-t from-[#FF6B35] to-[#FF8C61] transition-all duration-500 hover:brightness-95"
                  />
                  <span className="mt-2 font-mono text-[8px] font-bold text-slate-400">
                    #{idx + 1}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-[10px] font-semibold text-slate-500">
          AOV = Total Revenue ÷ Fulfilled Orders = ₹{metrics.aov}
        </p>
      </div>
    </div>
  )
}
