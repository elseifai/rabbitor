'use client'

import Link from 'next/link'
import { getMerchantOrdersAction, updateOrderStatusAction } from '@/actions/orders'
import { ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import type { OrderStatus } from '@rabbit/database'
import { formatCurrency } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const MERCHANT_ACTIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['ACCEPTED_BY_SHOP', 'CANCELLED'],
  ACCEPTED_BY_SHOP: ['PREPARING'],
  PREPARING: ['OUT_FOR_DELIVERY'],
}

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof getMerchantOrdersAction>>>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    getMerchantOrdersAction().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const advance = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatusAction(orderId, status)
    load()
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-rabbit-600" /></div>
  }

  return (
    <div>
      <Link href="/merchant" className="text-sm text-gray-500">← Dashboard</Link>
      <h2 className="mt-2 text-xl font-bold">Orders</h2>
      {orders.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">No orders yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => {
            const actions = MERCHANT_ACTIONS[o.status as OrderStatus] ?? []
            return (
              <div key={o.id} className="rounded-2xl border bg-white p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{o.orderNumber}</p>
                    <p className="text-xs text-gray-500">{o.shopName} · {o.customerPhone}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(o.totalPrice)}</p>
                </div>
                <p className="mt-2 text-sm text-rabbit-700">{ORDER_STATUS_LABELS[o.status as OrderStatus]}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {actions.map((next) => (
                    <button key={next} type="button" onClick={() => advance(o.id, next)} className="rounded-lg bg-rabbit-600 px-3 py-1.5 text-xs font-semibold text-white">
                      → {ORDER_STATUS_LABELS[next]}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
