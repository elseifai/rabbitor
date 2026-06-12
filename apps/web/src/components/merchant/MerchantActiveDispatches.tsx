'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Zap,
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

function secondsRemaining(fromIso: string, totalSeconds: number) {
  const elapsed = (Date.now() - new Date(fromIso).getTime()) / 1000
  return Math.max(0, Math.ceil(totalSeconds - elapsed))
}

function IncomingCountdown({
  createdAt,
  onExpired,
}: {
  createdAt: string
  onExpired?: () => void
}) {
  const [remaining, setRemaining] = useState(() => secondsRemaining(createdAt, 90))

  useEffect(() => {
    const tick = () => {
      const next = secondsRemaining(createdAt, 90)
      setRemaining(next)
      if (next <= 0) onExpired?.()
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [createdAt, onExpired])

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider',
        remaining <= 20 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800',
      )}
    >
      <Clock3 className="h-3 w-3" />
      {remaining}s to accept
    </span>
  )
}

function PrepCountdown({
  acceptedAt,
  prepMinutes,
}: {
  acceptedAt: string
  prepMinutes: number
}) {
  const totalSeconds = prepMinutes * 60
  const [remaining, setRemaining] = useState(() => secondsRemaining(acceptedAt, totalSeconds))
  const progress = Math.max(0, Math.min(100, ((totalSeconds - remaining) / totalSeconds) * 100))

  useEffect(() => {
    const tick = () => setRemaining(secondsRemaining(acceptedAt, totalSeconds))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [acceptedAt, totalSeconds])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
        <span>Preparation timer</span>
        <span className={remaining <= 60 ? 'text-[#FF6B35]' : 'text-slate-700'}>
          {mins}:{secs.toString().padStart(2, '0')} left
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#0C831F] transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function DispatchCard({
  order,
  alerting,
  prepMinutes,
  acceptedAt,
  busy,
  onAccept,
  onReject,
  onMarkPacked,
  onDispatch,
}: {
  order: MerchantOrder
  alerting: boolean
  prepMinutes: number
  acceptedAt?: string
  busy: boolean
  onAccept: () => void
  onReject: () => void
  onMarkPacked: () => void
  onDispatch: () => void
}) {
  return (
    <article
      className={cn(
        'rounded-2xl border bg-white p-4 shadow-sm transition-all',
        alerting
          ? 'animate-pulse border-[#FF6B35] shadow-[0_0_0_4px_rgba(255,107,53,0.2)]'
          : 'border-[#FF6B35]/10',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-900">Order #{order.orderNumber}</p>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
            {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {order.customerPhone}
          </p>
        </div>
        <p className="shrink-0 text-sm font-black text-slate-900">
          {formatCurrency(order.totalPrice)}
        </p>
      </div>

      {order.status === 'PENDING' && (
        <div className="mt-3 space-y-3">
          <IncomingCountdown createdAt={order.createdAt} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-[10px] font-black uppercase tracking-wider text-red-700 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject Order
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#0C831F] text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept Order
            </button>
          </div>
        </div>
      )}

      {order.status === 'ACCEPTED_BY_SHOP' && acceptedAt && (
        <>
          <PrepCountdown acceptedAt={acceptedAt} prepMinutes={prepMinutes} />
          <button
            type="button"
            disabled={busy}
            onClick={onMarkPacked}
            className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-xs font-black uppercase tracking-wider text-white shadow-md disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            Mark as Packed / Order Prepared
          </button>
        </>
      )}

      {order.status === 'PREPARING' && (
        <button
          type="button"
          disabled={busy}
          onClick={onDispatch}
          className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#1C1C1C] text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
        >
          Ready — Send for Delivery
        </button>
      )}
    </article>
  )
}

// MERCHANT DASHBOARD EXPANSION — real-time order pipeline for main dashboard
export function MerchantActiveDispatches({
  prepMinutes,
  onOrdersChange,
}: {
  prepMinutes: number
  onOrdersChange?: (orders: MerchantOrder[]) => void
}) {
  const [orders, setOrders] = useState<MerchantOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [alertingIds, setAlertingIds] = useState<Set<string>>(new Set())
  const [rejectTarget, setRejectTarget] = useState<MerchantOrder | null>(null)
  const [socketToken, setSocketToken] = useState<string | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [acceptedAtMap, setAcceptedAtMap] = useState<Record<string, string>>({})

  const alert = useOrderAlert()

  const activeOrders = useMemo(
    () =>
      orders.filter((o) =>
        ['PENDING', 'ACCEPTED_BY_SHOP', 'PREPARING'].includes(o.status),
      ),
    [orders],
  )

  useEffect(() => {
    onOrdersChange?.(activeOrders)
  }, [activeOrders, onOrdersChange])

  const loadOrders = useCallback(async () => {
    const data = await getMerchantOrdersAction().catch(() => [])
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    getMerchantRealtimeAuthAction().then((res) => {
      if (res.ok) {
        setSocketToken(res.token)
        setStoreId(res.storeId)
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
        totalPrice: incoming.totalPrice + incoming.deliveryFee,
        itemCount: incoming.itemCount,
        createdAt: incoming.createdAt,
        items: incoming.items,
      }
      return [mapped, ...prev.filter((o) => o.id !== mapped.id)]
    })
  }, [])

  const handleNewOrder = useCallback(
    (payload: MerchantNewOrderEvent) => {
      upsertOrder(payload)
      if (payload.requiresAck) {
        setAlertingIds((prev) => new Set(prev).add(payload.id))
        alert.start()
      }
    },
    [alert, upsertOrder],
  )

  useMerchantOrderSocket(socketToken, storeId, handleNewOrder)

  useEffect(() => {
    if (alertingIds.size === 0) alert.stop()
  }, [alertingIds, alert])

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
    if (status === 'ACCEPTED_BY_SHOP') {
      setAcceptedAtMap((prev) => ({ ...prev, [orderId]: new Date().toISOString() }))
    }

    setOrders((prev) =>
      prev
        .map((o) => (o.id === orderId ? { ...o, status } : o))
        .filter((o) => !['DELIVERED', 'CANCELLED', 'OUT_FOR_DELIVERY'].includes(o.status)),
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alertingIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#FF6B35]/40 bg-[#FFF3ED] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#FF6B35]">
          <AlertCircle className="h-4 w-4 shrink-0 animate-pulse" />
          Incoming order — accept or reject to stop alert
        </div>
      )}

      {activeOrders.length === 0 ? (
        <p className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-xs font-medium text-slate-400">
          No active orders right now.
        </p>
      ) : (
        activeOrders.map((order) => (
          <DispatchCard
            key={order.id}
            order={order}
            alerting={alertingIds.has(order.id)}
            prepMinutes={prepMinutes}
            acceptedAt={acceptedAtMap[order.id]}
            busy={busyId === order.id}
            onAccept={() => void updateStatus(order.id, 'ACCEPTED_BY_SHOP')}
            onReject={() => setRejectTarget(order)}
            onMarkPacked={() => void updateStatus(order.id, 'PREPARING', 'Packed by merchant')}
            onDispatch={() => void updateStatus(order.id, 'OUT_FOR_DELIVERY', 'Ready for pickup')}
          />
        ))
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-sm font-black text-slate-900">Reject order #{rejectTarget.orderNumber}?</p>
            <div className="mt-4 space-y-2">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  disabled={busyId === rejectTarget.id}
                  onClick={() => {
                    void updateStatus(rejectTarget.id, 'CANCELLED', reason.label).then(() =>
                      setRejectTarget(null),
                    )
                  }}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50"
                >
                  {reason.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className="mt-3 w-full py-2 text-sm font-medium text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
