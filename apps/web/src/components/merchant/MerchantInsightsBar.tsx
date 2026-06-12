'use client'

import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, PauseCircle } from 'lucide-react'

type HealthPayload = {
  health: {
    score: number
    acceptanceRate: number
    rejectionRate: number
  }
  rushHour: {
    active: boolean
    preparingCount: number
    suggestPause: boolean
  }
  stockWarnings: Array<{ id: string; name: string; stock: number; reason: string }>
}

// MERCHANT DASHBOARD EXPANSION — Swiggy/Zepto-style hyperlocal insights
export function MerchantInsightsBar({
  onSuggestPause,
}: {
  onSuggestPause?: () => void
}) {
  const [data, setData] = useState<HealthPayload | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/merchant/health')
        const json = await res.json()
        if (json.success) setData(json)
      } catch {
        setData(null)
      }
    }
    void load()
    const id = window.setInterval(load, 30_000)
    return () => window.clearInterval(id)
  }, [])

  if (!data) return null

  const scoreColor =
    data.health.score >= 80
      ? 'text-[#0C831F]'
      : data.health.score >= 60
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Activity className="h-3.5 w-3.5 text-[#FF6B35]" />
            Store Health Score
          </div>
          <p className={`mt-2 text-3xl font-black ${scoreColor}`}>{data.health.score}</p>
          <p className="mt-1 text-[10px] font-semibold text-slate-500">
            {data.health.acceptanceRate}% accept · {data.health.rejectionRate}% reject
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Preparing now
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {data.rushHour.preparingCount}
          </p>
          <p className="mt-1 text-[10px] font-semibold text-slate-500">concurrent orders</p>
        </div>
      </div>

      {data.rushHour.suggestPause && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-xs font-black text-amber-900">Spike / Rush Hour Warning</p>
            <p className="mt-0.5 text-[11px] font-medium text-amber-800">
              {data.rushHour.preparingCount} orders are in preparation. Consider pausing new orders
              until you catch up.
            </p>
            {onSuggestPause && (
              <button
                type="button"
                onClick={onSuggestPause}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                Set store to Paused / Busy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function stockWarningIds(data: HealthPayload | null): Set<string> {
  if (!data) return new Set()
  return new Set(data.stockWarnings.map((w) => w.id))
}
