'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Package,
  Radio,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'
import type { OrderStatus } from '@rabbit/database'
import { getMerchantOrdersAction, updateOrderStatusAction } from '@/actions/orders'
import { getMerchantRealtimeAuthAction } from '@/actions/merchant'
import { useMerchantOrderSocket, type MerchantNewOrderEvent } from '@/hooks/useMerchantOrderSocket'
import { useOrderAlert } from '@/hooks/useOrderAlert'
import { formatCurrency, cn } from '@/lib/utils'

type MerchantOrder = Awaited<ReturnType<typeof getMerchantOrdersAction>>[number]

const REJECT_REASONS = [
  { id: 'missing', label: 'Item missing' },
  { id: 'closing', label: 'Store closing' },
] as const

function secondsRemaining(createdAt: string, deadlineSeconds: number) {
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000
  return Math.max(0, Math.ceil(deadlineSeconds - elapsed))
}

function OrderCountdown({
  createdAt,
  deadlineSeconds,
  onExpired,
}: {
  createdAt: string
  deadlineSeconds: number
  onExpired?: () => void
}) {
  const [remaining, setRemaining] = useState(() =>
    secondsRemaining(createdAt, deadlineSeconds),
  )

  useEffect(() => {
    const tick = () => {
      const next = secondsRemaining(createdAt, deadlineSeconds)
      setRemaining(next)
      if (next <= 0) onExpired?.()
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [createdAt, deadlineSeconds, onExpired])

  const urgent = remaining <= 20

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        urgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800',
      )}
    >
      <Clock3 className="h-3.5 w-3.5" />
      {remaining}s left
    </span>
  )
}

function ConnectionBadge({
  state,
  error,
}: {
  state: string
  error: string | null
}) {
  const connected = state === 'connected'
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
        connected ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600',
      )}
    >
      {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {connected ? 'Live orders connected' : error ?? 'Reconnecting…'}
    </div>
  )
}

function OrderCard({
  order,
  alerting,
  onAccept,
  onReject,
  onAdvance,
  busy,
}: {
  order: MerchantOrder
  alerting: boolean
  onAccept?: () => void
  onReject?: () => void
  onAdvance?: (status: OrderStatus) => void
  busy: boolean
}) {
  return (
    <article
      className={cn(
        'rounded-2xl border-2 bg-white p-4 shadow-sm transition-shadow',
        alerting
          ? 'animate-pulse border-[#FF6B35] shadow-[0_0_0_4px_rgba(255,107,53,0.15)]'
          : 'border-[#F0F0F0]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-[#1C1C1C]">{order.orderNumber}</p>
          <p className="mt-0.5 text-sm text-[#878787]">{order.customerPhone}</p>
        </div>
        <p className="text-lg font-bold text-[#0C831F]">{formatCurrency(order.totalPrice)}</p>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-[#1C1C1C]">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="truncate">
              {item.name} <span className="text-[#878787]">×{item.quantity}</span>
            </span>
            <span className="shrink-0 font-semibold">
              {formatCurrency(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {order.status === 'PENDING' && (
        <div className="mt-4 flex flex-col gap-3">
          <OrderCountdown createdAt={order.createdAt} deadlineSeconds={90} />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 text-sm font-bold text-red-700 active:scale-[0.98] disabled:opacity-50"
            >
              <XCircle className="h-5 w-5" />
              Reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#0C831F] text-sm font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              Accept Order
            </button>
          </div>
        </div>
      )}

      {order.status === 'ACCEPTED_BY_SHOP' && onAdvance && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdvance('PREPARING')}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-sm font-bold text-white"
        >
          <Package className="h-4 w-4" />
          Start Packing
        </button>
      )}

      {order.status === 'PREPARING' && onAdvance && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdvance('OUT_FOR_DELIVERY')}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#1C1C1C] text-sm font-bold text-white"
        >
          <Radio className="h-4 w-4" />
          Ready — Send for Delivery
        </button>
      )}
    </article>
  )
}

export function MerchantIncomingOrdersPanel() {
  const [orders, setOrders] = useState<MerchantOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [alertingIds, setAlertingIds] = useState<Set<string>>(new Set())
  const [rejectTarget, setRejectTarget] = useState<MerchantOrder | null>(null)
  const [socketToken, setSocketToken] = useState<string | null>(null)
  const [storeIds, setStoreIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'incoming' | 'preparing' | 'ready'>('incoming')

  const alert = useOrderAlert()

  const loadOrders = useCallback(async () => {
    const data = await getMerchantOrdersAction().catch(() => [])
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadOrders()
    const id = window.setInterval(() => void loadOrders(), 10_000)
    return () => window.clearInterval(id)
  }, [loadOrders])

  useEffect(() => {
    getMerchantRealtimeAuthAction().then((res) => {
      if (res.ok) {
        setSocketToken(res.token)
        setStoreIds(res.storeIds)
      }
    })
  }, [])

  const upsertOrder = useCallback((incoming: MerchantNewOrderEvent) => {
    setOrders((prev) => {
      const mapped: MerchantOrder = {
        id: incoming.id,
        orderNumber: incoming.orderNumber,
        status: incoming.status as OrderStatus,
        shopId: incoming.storeId,
        shopName: incoming.storeName,
        customerPhone: incoming.customerPhone,
        customerName: 'Customer',
        totalPrice: incoming.totalPrice + incoming.deliveryFee,
        subtotal: incoming.totalPrice,
        deliveryFee: incoming.deliveryFee,
        deliveryInstruction: null,
        itemCount: incoming.itemCount,
        createdAt: incoming.createdAt,
        items: incoming.items,
      }
      const without = prev.filter((o) => o.id !== mapped.id)
      return [mapped, ...without]
    })
  }, [])

  const handleNewOrder = useCallback(
    (payload: MerchantNewOrderEvent) => {
      upsertOrder(payload)
      if (payload.requiresAck) {
        setAlertingIds((prev) => new Set(prev).add(payload.id))
        alert.start()
        setActiveTab('incoming')
      }
    },
    [alert, upsertOrder],
  )

  const { connectionState, joinError } = useMerchantOrderSocket(
    socketToken,
    storeIds,
    handleNewOrder,
  )

  useEffect(() => {
    if (alertingIds.size === 0) alert.stop()
  }, [alertingIds, alert])

  const incoming = useMemo(
    () => orders.filter((o) => o.status === 'PENDING'),
    [orders],
  )
  const preparing = useMemo(
    () => orders.filter((o) => o.status === 'ACCEPTED_BY_SHOP'),
    [orders],
  )
  const ready = useMemo(
    () => orders.filter((o) => o.status === 'PREPARING'),
    [orders],
  )

  const silenceAlert = (orderId: string) => {
    setAlertingIds((prev) => {
      const next = new Set(prev)
      next.delete(orderId)
      return next
    })
  }

  const updateStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    setBusyId(orderId)
    const res = await updateOrderStatusAction(orderId, status, note)
    setBusyId(null)
    if (!res.ok) return
    silenceAlert(orderId)
    setOrders((prev) =>
      prev
        .map((o) => (o.id === orderId ? { ...o, status } : o))
        .filter((o) => !['DELIVERED', 'CANCELLED', 'OUT_FOR_DELIVERY'].includes(o.status)),
    )
    if (status === 'ACCEPTED_BY_SHOP') setActiveTab('preparing')
    if (status === 'PREPARING') setActiveTab('ready')
  }

  const columns = [
    { id: 'incoming' as const, label: 'Incoming', count: incoming.length, items: incoming },
    { id: 'preparing' as const, label: 'Preparing', count: preparing.length, items: preparing },
    { id: 'ready' as const, label: 'Ready for Pickup', count: ready.length, items: ready },
  ]

  const activeColumn = columns.find((c) => c.id === activeTab) ?? columns[0]

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#0C831F]" />
      </div>
    )
  }

  return (
    <div className="pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/merchant" className="text-sm font-medium text-[#878787]">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[#1C1C1C] sm:text-3xl">
            Incoming Orders
          </h1>
          <p className="mt-1 text-sm text-[#878787]">
            Accept orders in 90 seconds — no refresh needed
          </p>
        </div>
        <ConnectionBadge state={connectionState} error={joinError} />
      </div>

      {alertingIds.size > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#FF6B35]/30 bg-[#FFF3ED] px-4 py-3 text-sm font-semibold text-[#FF6B35]">
          <AlertCircle className="h-5 w-5 shrink-0" />
          New order waiting — tap Accept to stop the alert
        </div>
      )}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {columns.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => setActiveTab(col.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition',
              activeTab === col.id
                ? 'bg-[#1C1C1C] text-white'
                : 'bg-[#F5F5F5] text-[#5C5C5C]',
            )}
          >
            {col.label} ({col.count})
          </button>
        ))}
      </div>

      <div className="mt-6 hidden gap-4 lg:grid lg:grid-cols-3">
        {columns.map((col) => (
          <section key={col.id} className="min-w-0">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1C1C1C]">{col.label}</h2>
              <span className="rounded-full bg-[#F0F0F0] px-2.5 py-0.5 text-xs font-bold text-[#5C5C5C]">
                {col.count}
              </span>
            </header>
            <div className="space-y-4">
              {col.items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#E8E8E8] py-10 text-center text-sm text-[#878787]">
                  No orders here
                </p>
              ) : (
                col.items.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    alerting={alertingIds.has(order.id)}
                    busy={busyId === order.id}
                    onAccept={
                      col.id === 'incoming'
                        ? () => void updateStatus(order.id, 'ACCEPTED_BY_SHOP')
                        : undefined
                    }
                    onReject={
                      col.id === 'incoming' ? () => setRejectTarget(order) : undefined
                    }
                    onAdvance={
                      col.id !== 'incoming'
                        ? (status) => void updateStatus(order.id, status)
                        : undefined
                    }
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-4 space-y-4 lg:hidden">
        {activeColumn.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E8E8E8] py-16 text-center text-sm text-[#878787]">
            No orders in {activeColumn.label.toLowerCase()}
          </p>
        ) : (
          activeColumn.items.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              alerting={alertingIds.has(order.id)}
              busy={busyId === order.id}
              onAccept={
                activeColumn.id === 'incoming'
                  ? () => void updateStatus(order.id, 'ACCEPTED_BY_SHOP')
                  : undefined
              }
              onReject={
                activeColumn.id === 'incoming' ? () => setRejectTarget(order) : undefined
              }
              onAdvance={
                activeColumn.id !== 'incoming'
                  ? (status) => void updateStatus(order.id, status)
                  : undefined
              }
            />
          ))
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-lg font-bold text-[#1C1C1C]">Why reject this order?</h3>
            <p className="mt-1 text-sm text-[#878787]">{rejectTarget.orderNumber}</p>
            <div className="mt-4 space-y-2">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  disabled={busyId === rejectTarget.id}
                  onClick={() => {
                    void updateStatus(
                      rejectTarget.id,
                      'CANCELLED',
                      reason.label,
                    ).then(() => setRejectTarget(null))
                  }}
                  className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#F0F0F0] text-sm font-bold text-[#1C1C1C] hover:bg-[#FAFAFA]"
                >
                  {reason.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className="mt-3 w-full py-2 text-sm font-semibold text-[#878787]"
            >
              Go back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
