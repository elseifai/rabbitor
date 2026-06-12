'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Layers, Loader2, RefreshCw } from 'lucide-react'
import { getMerchantShopAction } from '@/actions/merchant'
import {
  DEMO_ANALYTICS,
  DEMO_CHART,
  MerchantSalesAnalytics,
  type AnalyticsMetrics,
  type ChartPoint,
} from '@/components/merchant/MerchantSalesAnalytics'
import { MerchantActiveDispatches } from '@/components/merchant/MerchantActiveDispatches'
import { MerchantInsightsBar } from '@/components/merchant/MerchantInsightsBar'

// MERCHANT SIDEBAR & CATALOG REFACTOR — overview tab (analytics + live dispatches)
export function MerchantDashboard() {
  const [hasShop, setHasShop] = useState(false)
  const [avgPrepMinutes, setAvgPrepMinutes] = useState(20)
  const [analytics, setAnalytics] = useState<AnalyticsMetrics>(DEMO_ANALYTICS)
  const [chartData, setChartData] = useState<ChartPoint[]>(DEMO_CHART)
  const [analyticsLive, setAnalyticsLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      const merchantShop = await getMerchantShopAction()
      if (merchantShop) {
        setHasShop(true)
        setAvgPrepMinutes(merchantShop.avgPrepMinutes ?? 20)
        try {
          const analyticsRes = await fetch('/api/merchant/analytics')
          const analyticsJson = await analyticsRes.json()
          if (analyticsJson.success) {
            setAnalytics(analyticsJson.metrics)
            setChartData(analyticsJson.chartData ?? [])
            setAnalyticsLive(true)
          }
        } catch {
          setAnalytics(DEMO_ANALYTICS)
          setChartData(DEMO_CHART)
          setAnalyticsLive(false)
        }
      } else {
        setHasShop(false)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={refreshing}
          className="rounded-xl border p-2 text-gray-500 hover:text-[#FF6B35] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!hasShop && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-center">
          <p className="text-sm font-bold text-amber-900">No store registered yet</p>
          <Link
            href="/merchant/signup"
            className="mt-2 inline-block rounded-lg bg-[#FF6B35] px-4 py-1.5 text-xs font-bold text-white"
          >
            Merchant signup →
          </Link>
        </div>
      )}

      {hasShop && <MerchantInsightsBar />}

      <MerchantSalesAnalytics metrics={analytics} chartData={chartData} live={analyticsLive} />

      {hasShop && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-gray-400">
            <Layers className="h-3.5 w-3.5 text-[#FF6B35]" /> Active Direct Dispatches
          </h3>
          <MerchantActiveDispatches prepMinutes={avgPrepMinutes} />
        </div>
      )}
    </div>
  )
}
