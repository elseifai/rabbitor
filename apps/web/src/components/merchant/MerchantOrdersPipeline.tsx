'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { OrderStatus } from '@rabbit/database'
import { MerchantActiveDispatches } from '@/components/merchant/MerchantActiveDispatches'
import { getMerchantShopAction } from '@/actions/merchant'
import { formatCurrency, cn } from '@/lib/utils'

type OrderRow = {
  id: string
  orderNumber: string
  status: OrderStatus
  totalPrice: number
  itemCount: number
  createdAt: string
}

const PIPELINES = [
  { id: 'ACTIVE', label: 'Active', statuses: ['PENDING', 'ACCEPTED_BY_SHOP', 'PREPARING', 'OUT_FOR_DELIVERY'] as OrderStatus[] },
  { id: 'PENDING', label: 'Pending', statuses: ['PENDING'] as OrderStatus[] },
  { id: 'COMPLETED', label: 'Completed', statuses: ['DELIVERED'] as OrderStatus[] },
  { id: 'CANCELLED', label: 'Cancelled', statuses: ['CANCELLED'] as OrderStatus[] },
] as const

// MERCHANT SIDEBAR & CATALOG REFACTOR — orders pipeline tabs
export function MerchantOrdersPipeline() {
  const [pipeline, setPipeline] = useState<(typeof PIPELINES)[number]['id']>('ACTIVE')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [avgPrepMinutes, setAvgPrepMinutes] = useState(20)

  const load = useCallback(async () => {
    const shop = await getMerchantShopAction()
    if (shop) setAvgPrepMinutes(shop.avgPrepMinutes ?? 20)

    const res = await fetch('/api/merchant/orders')
    const json = await res.json()
    if (json.success) setOrders(json.orders ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 30_000)
    return () => window.clearInterval(id)
  }, [load])

  const current = PIPELINES.find((p) => p.id === pipeline)!
  const filtered = useMemo(
    () => orders.filter((o) => current.statuses.includes(o.status)),
    [orders, current],
  )

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PIPELINES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPipeline(p.id)}
            className={cn(
              'rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider',
              pipeline === p.id ? 'bg-[#FF6B35] text-white' : 'bg-white text-gray-500 border border-gray-200',
            )}
          >
            {p.label}
            <span className="ml-1.5 opacity-70">
              ({orders.filter((o) => p.statuses.includes(o.status)).length})
            </span>
          </button>
        ))}
      </div>

      {pipeline === 'ACTIVE' ? (
        <MerchantActiveDispatches prepMinutes={avgPrepMinutes} />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-gray-400">
                    No {current.label.toLowerCase()} orders
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold">#{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase">
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#0C831F]">
                      {formatCurrency(o.totalPrice)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
