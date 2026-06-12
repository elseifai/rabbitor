'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// MERCHANT SIDEBAR & CATALOG REFACTOR — revenue & payout history
export function MerchantRevenuePanel() {
  const [data, setData] = useState<{
    totalRevenue: number
    deliveredOrders: number
    pendingPayout: number
    bankAccountRef: string | null
    ifscCode: string | null
    transactions: { id: string; orderNumber: string; amount: number; date: string }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/merchant/revenue')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-center text-sm text-gray-400">Revenue data unavailable</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[10px] font-bold uppercase text-gray-400">Total revenue</p>
          <p className="mt-1 text-2xl font-black text-[#0C831F]">{formatCurrency(data.totalRevenue)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[10px] font-bold uppercase text-gray-400">Delivered orders</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{data.deliveredOrders}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-[10px] font-bold uppercase text-gray-400">Pending payout</p>
          <p className="mt-1 text-2xl font-black text-[#FF6B35]">{formatCurrency(data.pendingPayout)}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wider text-gray-400">Payout account</p>
        <p className="mt-2 font-mono text-sm text-gray-700">
          {data.bankAccountRef ? `****${data.bankAccountRef.slice(-4)}` : 'Not configured'}
          {data.ifscCode ? ` · ${data.ifscCode}` : ''}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <h3 className="border-b px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">
          Recent settlements
        </h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
            <tr>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.transactions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No delivered orders yet
                </td>
              </tr>
            ) : (
              data.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-mono text-xs">#{t.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{t.date}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#0C831F]">{formatCurrency(t.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
