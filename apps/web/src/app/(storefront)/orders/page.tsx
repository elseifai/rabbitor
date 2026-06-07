'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, ArrowLeft } from 'lucide-react'
import { ORDER_STATUS_LABELS } from '@/lib/order-pipeline'
import { formatCurrency } from '@/lib/utils'
import type { OrderStatus } from '@rabbit/database'

type OrderRow = {
  id: string
  orderNumber: string
  storeName: string
  status: OrderStatus
  totalPrice: number
  paymentStatus: string
  createdAt: string
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED_BY_SHOP: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-indigo-100 text-indigo-800',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/orders/list')
      .then(async (res) => {
        const json = await res.json()
        if (!json.success) {
          if (res.status === 401) {
            setError('Please log in to view your orders.')
            return
          }
          setError(json.error ?? 'Could not load orders')
          return
        }
        setOrders(json.data.orders)
      })
      .catch(() => setError('Could not load orders'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/shops"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-rabbit-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to shops
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-gray-900">My Orders</h1>
      <p className="mt-1 text-sm text-gray-500">Your order history, newest first</p>

      {loading && (
        <p className="mt-12 text-center text-sm text-gray-500">Loading orders…</p>
      )}

      {error && (
        <div className="mt-12 rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <p className="text-gray-600">{error}</p>
          {error.includes('log in') && (
            <Link href="/auth?redirect=/orders" className="mt-2 inline-block text-sm text-[#FF6B35]">
              Log in
            </Link>
          )}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="mt-12 rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-600">No orders yet</p>
          <Link href="/" className="mt-2 inline-block text-sm text-[#FF6B35]">
            Start Shopping
          </Link>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {orders.map((order) => (
          <li key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{order.storeName}</p>
                <p className="text-xs text-gray-500">{order.orderNumber}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(order.createdAt)}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[order.status]}`}
              >
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-bold text-[#0C831F]">{formatCurrency(order.totalPrice)}</span>
              <Link
                href={`/track/${order.id}`}
                className="rounded-lg bg-[#FF6B35] px-3 py-1.5 text-xs font-bold text-white"
              >
                Track Order
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
