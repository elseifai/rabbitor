'use client'

import { useEffect, useState } from 'react'
import { IndianRupee, Loader2, TrendingUp, Wallet } from 'lucide-react'
import { getRiderEarningsAction, requestRiderPayoutAction } from '@/actions/rider-onboarding'
import { formatCurrency } from '@/lib/utils'

export function DeliveryEarningsWallet() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof getRiderEarningsAction>> | null>(null)

  useEffect(() => {
    void getRiderEarningsAction().then((res) => {
      setData(res)
      setLoading(false)
    })
  }, [])

  const requestPayout = async () => {
    setBusy(true)
    setMessage(null)
    const res = await requestRiderPayoutAction()
    setBusy(false)
    setMessage(res.ok ? res.message : res.error)
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-lg shadow-orange-200">
        <div className="flex items-center gap-2 text-orange-100">
          <Wallet className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">Today&apos;s wallet</span>
        </div>
        <p className="mt-2 text-4xl font-black">{formatCurrency(data.todayTotal)}</p>
        <p className="mt-1 text-sm text-orange-100">{data.todayTrips} completed deliveries</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="This week" value={formatCurrency(data.weekTotal)} icon={TrendingUp} />
        <StatCard label="Trips" value={String(data.weekTrips)} icon={IndianRupee} />
      </div>

      <button
        type="button"
        disabled={busy || data.weekTotal <= 0}
        onClick={() => void requestPayout()}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-gray-900 text-sm font-bold text-white disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Request immediate payout'}
      </button>

      {message && (
        <p className="rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800">{message}</p>
      )}

      <div className="rounded-3xl border border-orange-100 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Recent earnings</p>
        {data.recent.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Complete deliveries to see routing fees and bonuses here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-orange-50">
            {data.recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{row.shopName}</p>
                  <p className="text-xs text-gray-500">{row.orderNumber}</p>
                </div>
                <p className="font-bold text-orange-600">{formatCurrency(row.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Wallet
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4">
      <Icon className="h-4 w-4 text-orange-500" />
      <p className="mt-2 text-[10px] font-bold uppercase text-gray-400">{label}</p>
      <p className="text-lg font-black text-gray-900">{value}</p>
    </div>
  )
}
