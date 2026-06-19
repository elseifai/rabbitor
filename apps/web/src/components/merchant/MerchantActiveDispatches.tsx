'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Package,
  User,
  XCircle,
  Zap,
} from 'lucide-react'
import type { OrderStatus } from '@rabbit/database'
import { getMerchantOrdersAction, updateOrderStatusAction } from '@/actions/orders'
import { getMerchantRealtimeAuthAction } from '@/actions/merchant'
import { useMerchantOrderSocket, type MerchantNewOrderEvent } from '@/hooks/useMerchantOrderSocket'
import { useOrderAlert } from '@/hooks/useOrderAlert'
import {
  AnimatedAcceptCountdown,
  HandoverCountdown,
} from '@/components/merchant/AnimatedAcceptCountdown'
import { formatCurrency, cn } from '@/lib/utils'

type MerchantOrder = Awaited<ReturnType<typeof getMerchantOrdersAction>>[number]
type RiderStage = 'ASSIGNED' | 'ARRIVED_AT_STORE' | 'PICKED_UP' | 'DELIVERED'

const REJECT_REASONS = [
  { id: 'missing', label: 'Item missing' },
  { id: 'closing', label: 'Store closing' },
] as const

function secondsRemaining(fromIso: string, totalSeconds: number) {
  const elapsed = (Date.now() - new Date(fromIso).getTime()) / 1000
  return Math.max(0, Math.ceil(totalSeconds - elapsed))
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
        <span>Packing timer</span>
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

function OrderLineItems({ order }: { order: MerchantOrder }) {
  return (
    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <Package className="h-3.5 w-3.5 text-[#FF6B35]" />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          Order items ({order.itemCount})
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
              <p className="text-[10px] font-medium text-slate-400">
                Qty {item.quantity} × {formatCurrency(item.price)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-black text-slate-900">
              {formatCurrency(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-slate-100 px-3 py-2 text-xs">
        <span className="font-medium text-slate-500">Order total</span>
        <span className="font-black text-[#0C831F]">{formatCurrency(order.totalPrice)}</span>
      </div>
    </div>
  )
}

function DispatchCard({
  order,
  alerting,
  prepMinutes,
  acceptedAt,
  packedAt,
  riderStage,
  handoverStartedAt,
  pickupNotice,
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
  packedAt?: string
  riderStage?: RiderStage
  handoverStartedAt?: string
  pickupNotice?: boolean
  busy: boolean
  onAccept: () => void
  onReject: () => void
  onMarkPacked: () => void
  onDispatch: () => void
}) {
  const riderAtStore =
    riderStage === 'ARRIVED_AT_STORE' ||
    riderStage === 'PICKED_UP' ||
    riderStage === 'DELIVERED'
  const showHandover = Boolean(packedAt && riderAtStore && handoverStartedAt)

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-white shadow-sm transition-all',
        alerting
          ? 'animate-pulse border-[#FF6B35] shadow-[0_0_0_4px_rgba(255,107,53,0.15)]'
          : 'border-[#FF6B35]/10',
      )}
    >
      {order.status === 'PENDING' && (
        <div className="bg-gradient-to-br from-[#FFF3ED] to-white px-4 pt-4">
          <AnimatedAcceptCountdown createdAt={order.createdAt} />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#FF6B35]">
              {order.status === 'PENDING' ? 'Incoming order' : 'Active order'}
            </p>
            <p className="text-base font-black text-slate-900">#{order.orderNumber}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <User className="h-3 w-3" />
              {order.customerName} · {order.customerPhone}
            </p>
          </div>
        </div>

        <OrderLineItems order={order} />

        {order.deliveryInstruction && (
          <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                Customer request
              </p>
              <p className="mt-0.5 text-sm font-medium text-amber-900">
                {order.deliveryInstruction}
              </p>
            </div>
          </div>
        )}

        {pickupNotice && (
          <div className="mt-3 rounded-xl bg-[#0C831F]/10 px-3 py-2 text-center text-xs font-bold text-[#0C831F]">
            ✓ Rider picked up — order is out for delivery
          </div>
        )}

        {order.status === 'PENDING' && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-[10px] font-black uppercase tracking-wider text-red-700 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-[#0C831F] text-[10px] font-black uppercase tracking-wider text-white shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept order
            </button>
          </div>
        )}

        {order.status === 'ACCEPTED_BY_SHOP' && acceptedAt && (
          <>
            <PrepCountdown acceptedAt={acceptedAt} prepMinutes={prepMinutes} />
            {riderStage === 'ASSIGNED' && (
              <p className="mt-2 text-[10px] font-medium text-slate-400">
                Rider assigned — waiting for arrival at store
              </p>
            )}
            {riderAtStore && !packedAt && (
              <p className="mt-2 text-[10px] font-bold text-emerald-700">
                Rider at store — pack order to start handover
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={onMarkPacked}
              className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-xs font-black uppercase tracking-wider text-white shadow-md disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              Mark as packed
            </button>
          </>
        )}

        {order.status === 'PREPARING' && (
          <>
            {showHandover && handoverStartedAt && (
              <HandoverCountdown startedAt={handoverStartedAt} />
            )}
            {packedAt && !riderAtStore && (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-500">
                Packed & ready — handover timer starts when rider reaches store
              </p>
            )}
            {riderAtStore && !showHandover && (
              <p className="mt-3 text-xs font-bold text-emerald-700">Rider at store — ready to hand over</p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={onDispatch}
              className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#1C1C1C] text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
            >
              Ready — send for delivery
            </button>
          </>
        )}
      </div>
    </article>
  )
}

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
  const [storeIds, setStoreIds] = useState<string[]>([])
  const [acceptedAtMap, setAcceptedAtMap] = useState<Record<string, string>>({})
  const [packedAtMap, setPackedAtMap] = useState<Record<string, string>>({})
  const [riderStageMap, setRiderStageMap] = useState<Record<string, RiderStage>>({})
  const [handoverStartedMap, setHandoverStartedMap] = useState<Record<string, string>>({})
  const [pickupNoticeIds, setPickupNoticeIds] = useState<Set<string>>(new Set())
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

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

  const maybeStartHandover = useCallback(
    (orderId: string, stage?: RiderStage, packedAt?: string) => {
      const packed = packedAt ?? packedAtMap[orderId]
      const riderStage = stage ?? riderStageMap[orderId]
      const atStore =
        riderStage === 'ARRIVED_AT_STORE' ||
        riderStage === 'PICKED_UP' ||
        riderStage === 'DELIVERED'
      if (packed && atStore && !handoverStartedMap[orderId]) {
        setHandoverStartedMap((prev) => ({ ...prev, [orderId]: new Date().toISOString() }))
      }
    },
    [packedAtMap, riderStageMap, handoverStartedMap],
  )

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

  const handleRiderStage = useCallback(
    (payload: { orderId: string; stage: string }) => {
      const stage = payload.stage as RiderStage
      setRiderStageMap((prev) => ({ ...prev, [payload.orderId]: stage }))
      if (stage === 'PICKED_UP') {
        setPickupNoticeIds((prev) => new Set(prev).add(payload.orderId))
        window.setTimeout(() => {
          setPickupNoticeIds((prev) => {
            const next = new Set(prev)
            next.delete(payload.orderId)
            return next
          })
        }, 8000)
      }
      maybeStartHandover(payload.orderId, stage)
    },
    [maybeStartHandover],
  )

  useMerchantOrderSocket(
    socketToken,
    storeIds,
    handleNewOrder,
    handleRiderStage,
    (payload) => {
      if (payload.status === 'DELIVERED') {
        setFeedbackToast(`Order delivered — awaiting customer feedback`)
        window.setTimeout(() => setFeedbackToast(null), 5000)
      }
    },
    (payload) => {
      setFeedbackToast(
        `New rating: ★${payload.shopRating} store · ★${payload.riderRating} delivery`,
      )
      window.setTimeout(() => setFeedbackToast(null), 8000)
    },
  )

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
    if (status === 'PREPARING') {
      const packedAt = new Date().toISOString()
      setPackedAtMap((prev) => ({ ...prev, [orderId]: packedAt }))
      maybeStartHandover(orderId, riderStageMap[orderId], packedAt)
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
      {feedbackToast && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          {feedbackToast}
        </div>
      )}

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
            packedAt={packedAtMap[order.id]}
            riderStage={riderStageMap[order.id]}
            handoverStartedAt={handoverStartedMap[order.id]}
            pickupNotice={pickupNoticeIds.has(order.id)}
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
            <p className="text-sm font-black text-slate-900">
              Reject order #{rejectTarget.orderNumber}?
            </p>
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
