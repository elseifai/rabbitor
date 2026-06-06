'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  Phone,
  Package,
  Store,
  Wifi,
} from 'lucide-react'
import { useOrderSocket } from '@/hooks/useOrderSocket'
import {
  labelToOrderStatus,
  orderStatusToStepIndex,
  TRACKING_TIMELINE_STEPS,
  trackingFromOrderStatus,
} from '@/lib/tracking-status'

import type { OrderStatus } from '@rabbit/database'

const STEP_ICONS = [Store, Package, Bike, CheckCircle2] as const

type RiderInfo = {
  name: string
  phone: string
}

type OrderSnapshot = {
  orderNumber: string
  shopName: string
  status: OrderStatus
  eta: number
  message: string
  rider: RiderInfo | null
}

export function LiveTrackingView({ orderId }: { orderId: string }) {
  const { connected, status: liveStatusLabel } = useOrderSocket(orderId)
  const [snapshot, setSnapshot] = useState<OrderSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const syncOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      const json = await res.json()
      if (!json.success) {
        if (res.status === 404) setNotFound(true)
        return
      }
      if (json.data) {
        setNotFound(false)
        const tracking = trackingFromOrderStatus(json.data.status)
        const partner = json.data.deliveryPartner
        setSnapshot({
          orderNumber: json.data.orderNumber,
          shopName: json.data.shop?.name ?? 'Your Store',
          status: json.data.status,
          eta: tracking.eta,
          message: tracking.msg,
          rider: partner
            ? { name: partner.name, phone: partner.phone }
            : null,
        })
      }
    } catch (err) {
      console.error('Tracking sync error:', err)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void syncOrder()
    const interval = setInterval(() => void syncOrder(), 4000)
    return () => clearInterval(interval)
  }, [syncOrder])

  useEffect(() => {
    if (!liveStatusLabel) return
    const status = labelToOrderStatus(liveStatusLabel)
    if (!status) return
    const tracking = trackingFromOrderStatus(status)
    setSnapshot((prev) => ({
      orderNumber: prev?.orderNumber ?? orderId.slice(0, 12),
      shopName: prev?.shopName ?? 'Your Store',
      status,
      eta: tracking.eta,
      message: tracking.msg,
      rider: prev?.rider ?? null,
    }))
    setLoading(false)
  }, [liveStatusLabel, orderId])

  const currentStatus = snapshot?.status ?? 'PENDING'
  const activeIndex = orderStatusToStepIndex(currentStatus)
  const eta = snapshot?.eta ?? 15
  const arrived = currentStatus === 'DELIVERED'
  const displayId = snapshot?.orderNumber ?? orderId.slice(0, 12)
  const shopName = snapshot?.shopName ?? 'Your Store'

  if (loading) {
    return (
      <div className="pt-24 text-center text-sm font-bold text-slate-400">Locating Rider...</div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
        <p className="text-lg font-black text-slate-900">Order not found</p>
        <p className="mt-2 text-sm text-slate-500">
          This tracking link may be invalid or the order was removed.
        </p>
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
    <div className="relative mx-auto min-h-screen max-w-xl bg-[#F8FAFC] pb-24 font-sans text-slate-900 antialiased shadow-2xl">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:text-[#FF6B35]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-950">
              Track Order #{displayId}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {shopName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-[#FF6B35]/10 bg-[#FFF8F5] px-3 py-1.5">
          <Clock className="h-3.5 w-3.5 text-[#FF6B35]" />
          <span className="text-xs font-black text-[#FF6B35]">
            {arrived ? 'Arrived' : `${eta} Mins`}
          </span>
        </div>
      </div>

      {connected && (
        <p className="flex items-center justify-center gap-1 bg-green-50 py-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600">
          <Wifi className="h-3 w-3" /> Live WebSocket connected
        </p>
      )}

      <div className="p-5">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-md">
          <div className="relative z-10 space-y-1">
            <span className="rounded-md border border-white/5 bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#FF6B35]">
              On-Time Promise
            </span>
            <h2 className="pt-1 text-2xl font-black tracking-tight">
              {arrived ? 'Delivered!' : 'Arriving Swiftly'}
            </h2>
            <p className="text-xs font-medium text-white/70">
              {snapshot?.message ??
                'Your order is being packed carefully at the local shop.'}
            </p>
          </div>
          <div className="absolute -bottom-6 -right-4 rotate-12 select-none text-8xl opacity-10">
            🐇
          </div>
        </div>
      </div>

      <div className="px-5 pb-6">
        <div className="space-y-6 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xs">
          {TRACKING_TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx < activeIndex
            const isActive = idx === activeIndex
            const IconComponent = STEP_ICONS[idx]

            return (
              <div key={step.status} className="group relative flex items-start gap-4">
                {idx !== TRACKING_TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`absolute left-5 top-10 z-0 h-12 w-0.5 -translate-x-1/2 transition-colors duration-300 ${
                      idx < activeIndex ? 'bg-green-500' : 'bg-slate-100'
                    }`}
                  />
                )}

                <div
                  className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                    isCompleted
                      ? 'border-green-200 bg-green-50 text-green-600'
                      : isActive
                        ? 'scale-105 border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35] shadow-xs'
                        : 'border-slate-100 bg-slate-50 text-slate-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                </div>

                <div className="space-y-0.5 pt-0.5">
                  <h4
                    className={`text-xs font-black tracking-tight ${
                      isActive
                        ? 'text-[#FF6B35]'
                        : isCompleted
                          ? 'text-slate-800'
                          : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p className="text-xs font-medium leading-normal text-slate-400">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {(snapshot?.rider ||
        currentStatus === 'OUT_FOR_DELIVERY' ||
        currentStatus === 'DELIVERED') && (
        <div className="px-5">
          <div className="flex items-center justify-between rounded-[2rem] border border-slate-100 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-xl shadow-inner">
                🚴
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900">
                  {snapshot?.rider?.name ?? 'Assigning rider…'}
                </h3>
                <p className="flex items-center gap-1 text-[10px] font-bold tracking-tight text-slate-400">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${snapshot?.rider ? 'bg-green-500' : 'animate-pulse bg-amber-400'}`}
                  />
                  {snapshot?.rider
                    ? 'Verified Rabbit Fleet Rider'
                    : 'Matching nearest delivery partner'}
                </p>
              </div>
            </div>
            {snapshot?.rider && (
              <a
                href={`tel:+91${snapshot.rider.phone}`}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-700 transition hover:text-[#FF6B35]"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
