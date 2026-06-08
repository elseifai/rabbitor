'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Star } from 'lucide-react'
import type { OrderStatus } from '@rabbit/database'
import { useOrderSocket } from '@/hooks/useOrderSocket'
import { useCartStore } from '@/store'
import { getAuthHeader } from '@/lib/session'
import { formatCurrency } from '@/lib/utils'
import { labelToOrderStatus, trackingFromOrderStatus } from '@/lib/tracking-status'
import { RabbitProgressTrack } from '@/components/track/RabbitProgressTrack'
import { RabbitLiveMap } from '@/components/track/RabbitLiveMap'

type OrderItem = {
  id: string
  quantity: number
  price: number
  product: { name: string; unit: string; image: string | null }
}

type StatusEvent = { status: OrderStatus; createdAt: string }

type OrderData = {
  orderNumber: string
  status: OrderStatus
  deliveryAddress: string
  shopLat: number
  shopLng: number
  destLatitude: number | null
  destLongitude: number | null
  distanceKm: number
  estimatedDeliveryAt: string | null
  rabbitorName: string | null
  rabbitorPhone: string | null
  subtotal: number
  deliveryFee: number
  platformFee: number
  grandTotal: number
  discountAmount: number
  items: OrderItem[]
  statusHistory: StatusEvent[]
  shop: { name: string; address: string }
}

const STEPPER = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'ACCEPTED_BY_SHOP', label: 'Accepted' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'OUT_FOR_DELIVERY', label: 'On the way' },
] as const

function stepDone(status: OrderStatus, stepKey: string): boolean {
  const order: OrderStatus[] = [
    'PENDING',
    'ACCEPTED_BY_SHOP',
    'PREPARING',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ]
  const currentIdx = order.indexOf(status)
  const stepIdx = order.indexOf(stepKey as OrderStatus)
  if (currentIdx < 0 || stepIdx < 0) return false
  return currentIdx > stepIdx || (status === 'DELIVERED' && stepKey !== 'OUT_FOR_DELIVERY')
}

function stepTimestamp(history: StatusEvent[], stepKey: string): string | null {
  const hit = history.find((h) => h.status === stepKey)
  if (!hit) return null
  return new Date(hit.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function riderInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function LiveTrackingView({ orderId }: { orderId: string }) {
  const { status: liveStatusLabel } = useOrderSocket(orderId)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [shopRating, setShopRating] = useState(0)
  const [riderRating, setRiderRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)

  const syncOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { ...getAuthHeader() },
      })
      const json = await res.json()
      if (!json.success) {
        if (res.status === 404) setNotFound(true)
        return
      }
      setNotFound(false)
      setOrder(json.data as OrderData)
    } catch (err) {
      console.error('Tracking sync error:', err)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    useCartStore.getState().clearCart()
  }, [])

  useEffect(() => {
    void syncOrder()
    const interval = setInterval(() => void syncOrder(), 4000)
    return () => clearInterval(interval)
  }, [syncOrder])

  useEffect(() => {
    if (!liveStatusLabel) return
    const status = labelToOrderStatus(liveStatusLabel)
    if (!status) return
    setOrder((prev) => (prev ? { ...prev, status } : prev))
    setLoading(false)
  }, [liveStatusLabel])

  useEffect(() => {
    if (!order?.estimatedDeliveryAt || order.status !== 'OUT_FOR_DELIVERY') {
      setCountdown(null)
      return
    }
    const tick = () => {
      const diff = Math.max(
        0,
        Math.round((new Date(order.estimatedDeliveryAt!).getTime() - Date.now()) / 60000),
      )
      setCountdown(diff)
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [order?.estimatedDeliveryAt, order?.status])

  const currentStatus = order?.status ?? 'PENDING'
  const tracking = trackingFromOrderStatus(currentStatus)
  const eta = countdown ?? tracking.eta
  const destLat = order?.destLatitude ?? order?.shopLat ?? 19.1364
  const destLng = order?.destLongitude ?? order?.shopLng ?? 72.8296
  const showRider =
    currentStatus === 'OUT_FOR_DELIVERY' || currentStatus === 'DELIVERED'
  const showMap = currentStatus === 'OUT_FOR_DELIVERY'
  const delivered = currentStatus === 'DELIVERED'

  const etaLabel = useMemo(() => {
    if (delivered) return 'Delivered!'
    if (currentStatus === 'OUT_FOR_DELIVERY' && countdown !== null) {
      return countdown <= 0 ? 'Arriving any moment…' : `Arriving in ~${countdown} mins`
    }
    return `Arriving in ~${eta} mins`
  }, [delivered, currentStatus, countdown, eta])

  const handleSubmitReview = async () => {
    if (shopRating < 1 || riderRating < 1) return
    setReviewLoading(true)
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          orderId,
          shopRating,
          riderRating,
          comment: reviewComment.trim() || undefined,
        }),
      })
      setReviewSubmitted(true)
    } catch {
      /* stub OK */
    } finally {
      setReviewLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="pt-24 text-center text-sm font-bold text-slate-400">Loading order…</div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
        <p className="text-lg font-black text-slate-900">Order not found</p>
        <Link
          href="/"
          className="mt-6 rounded-2xl bg-[#FF6B35] px-6 py-2.5 text-sm font-bold text-white"
        >
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-xl bg-[#F8FAFC] pb-24 font-sans text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-4">
        <Link
          href="/orders"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-base font-black text-slate-950">Track Order</h1>
          <p className="text-xs font-semibold text-slate-400">#{order.orderNumber}</p>
        </div>
      </div>

      {/* Rabbit progress bar */}
      <div className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
        <RabbitProgressTrack status={currentStatus} timeLeft={eta} />
        <p className="mt-2 text-center text-xs font-semibold text-slate-500">{etaLabel}</p>

        {/* 4-step horizontal stepper */}
        <div className="mt-4 flex justify-between gap-1">
          {STEPPER.map((step, idx) => {
            const done = stepDone(currentStatus, step.key)
            const ts = stepTimestamp(order.statusHistory, step.key)
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  {idx > 0 && (
                    <div className={`h-0.5 flex-1 ${done ? 'bg-green-500' : 'bg-slate-200'}`} />
                  )}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done
                        ? 'bg-green-500 text-white'
                        : 'border-2 border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    {done ? '✓' : '○'}
                  </div>
                  {idx < STEPPER.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        stepDone(currentStatus, STEPPER[idx + 1].key) ||
                        (currentStatus === 'DELIVERED' && idx < STEPPER.length - 1)
                          ? 'bg-green-500'
                          : done
                            ? 'bg-green-500'
                            : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
                <p className="mt-1 text-[10px] font-bold text-slate-600">{step.label}</p>
                {ts && <p className="text-[9px] text-slate-400">{ts}</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rider card */}
      {showRider && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-lg font-black text-white">
            {order.rabbitorName ? riderInitials(order.rabbitorName) : '🐰'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-400">Your Rabbit 🐰</p>
            <p className="text-base font-bold text-slate-900">
              {order.rabbitorName ?? 'Assigning rider…'}
            </p>
            <p className="text-[11px] text-slate-400">
              {order.rabbitorPhone ? 'On the way to you' : 'Your delivery partner'}
            </p>
          </div>
          {order.rabbitorPhone && (
            <a
              href={`tel:+91${order.rabbitorPhone}`}
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0C831F] text-white">
                <Phone className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-bold text-slate-500">Call</span>
            </a>
          )}
        </div>
      )}

      {/* Delivery address */}
      <div className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B35]" />
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400">Delivering to</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{order.deliveryAddress}</p>
            <p className="mt-1 text-xs text-slate-400">
              {order.distanceKm.toFixed(1)} km from shop
            </p>
          </div>
        </div>
      </div>

      {/* Order items */}
      <div className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Order Summary</h2>
        <ul className="mt-3 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {item.product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xl">📦</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.product.name}</p>
                <p className="text-xs text-slate-400">{item.product.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">x{item.quantity}</p>
                <p className="text-sm font-bold text-[#0C831F]">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="my-3 border-t border-slate-100" />
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Delivery fee</span>
            <span>{formatCurrency(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Platform fee</span>
            <span>{formatCurrency(order.platformFee)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-[#0C831F]">
              <span>Discount</span>
              <span>−{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
            <span>Total</span>
            <span className="text-[#0C831F]">{formatCurrency(order.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Live map */}
      {showMap && (
        <div className="mx-4 mt-4">
          <RabbitLiveMap
            orderId={orderId}
            status={currentStatus}
            shopLat={order.shopLat}
            shopLng={order.shopLng}
            destLat={destLat}
            destLng={destLng}
          />
        </div>
      )}

      {/* Rate order */}
      {delivered && !reviewSubmitted && (
        <div className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold">Rate your order</h2>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500">Shop rating</p>
            <StarRow value={shopRating} onChange={setShopRating} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500">Rider rating</p>
            <StarRow value={riderRating} onChange={setRiderRating} />
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Optional comment…"
            rows={3}
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleSubmitReview()}
            disabled={reviewLoading || shopRating < 1 || riderRating < 1}
            className="mt-3 w-full rounded-xl bg-[#FF6B35] py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {reviewLoading ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      )}

      {reviewSubmitted && (
        <p className="mx-4 mt-4 rounded-xl bg-green-50 p-4 text-center text-sm font-semibold text-green-700">
          Thanks for your review! 🎉
        </p>
      )}
    </div>
  )
}

function StarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-1 flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} stars`}
        >
          <Star
            className={`h-7 w-7 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
          />
        </button>
      ))}
    </div>
  )
}
