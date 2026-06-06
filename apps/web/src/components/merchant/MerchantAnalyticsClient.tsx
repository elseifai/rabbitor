'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, TrendingUp, Package, ShoppingCart, IndianRupee } from 'lucide-react'
import { getMerchantAnalyticsAction } from '@/actions/merchant'
import { formatCurrency } from '@/lib/utils'

type Analytics = NonNullable<Awaited<ReturnType<typeof getMerchantAnalyticsAction>>>

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  icon: typeof TrendingUp
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-rabbit-600" />
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

export function MerchantAnalyticsClient() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMerchantAnalyticsAction()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-rabbit-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="text-gray-600">No shop linked to this account.</p>
        <Link href="/merchant/login" className="mt-4 text-rabbit-600">
          Log in as merchant (9876543210)
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{data.shopName}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Today's orders"
          value={String(data.todayOrders)}
          sub={`${formatCurrency(data.todayRevenue)} revenue today`}
          icon={ShoppingCart}
        />
        <StatCard
          label="Total revenue"
          value={formatCurrency(data.totalRevenue)}
          sub={`${data.deliveredOrders} delivered orders`}
          icon={IndianRupee}
        />
        <StatCard
          label="Active orders"
          value={String(data.pendingOrders)}
          sub={`${data.totalOrders} orders all time`}
          icon={TrendingUp}
        />
        <StatCard
          label="Live products"
          value={String(data.liveProductCount)}
          sub={`${data.productCount} total in catalogue`}
          icon={Package}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-800">Quick insight</p>
        <p className="mt-2">
          {data.pendingOrders > 0
            ? `You have ${data.pendingOrders} order${data.pendingOrders === 1 ? '' : 's'} in progress. Head to Orders to fulfil them.`
            : data.todayOrders > 0
              ? 'All caught up for now. Keep your catalogue updated to attract more orders.'
              : 'No orders yet today. Make sure your shop is open and products are marked Live.'}
        </p>
        <Link
          href="/merchant/orders"
          className="mt-3 inline-block font-semibold text-rabbit-600 hover:underline"
        >
          View orders →
        </Link>
      </div>
    </div>
  )
}
