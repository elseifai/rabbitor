'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Wifi, WifiOff } from 'lucide-react'
import type { OrderStatus } from '@rabbit/database'
import { useOrderTrackingSocket } from '@/hooks/useOrderTrackingSocket'
import { useLocationStore } from '@/store'
import { getAuthHeader } from '@/lib/session'
import { etaMinutesFromRider } from '@/lib/tracking-eta'
import { trackingFromOrderStatus } from '@/lib/tracking-status'
import { formatCurrency, cn } from '@/lib/utils'
import { TrackingTimeline } from '@/components/track/TrackingTimeline'
import { GoogleOrderMap } from '@/components/track/GoogleOrderMap'
import { TrackingPageSkeleton } from '@/components/track/TrackingPageSkeleton'

type OrderData = {
  orderNumber: string
  status: OrderStatus
  deliveryAddress: string
  shopLat: number
  shopLng: number
  destLatitude: number | null
  destLongitude: number | null
  rabbitorName: string | null
  rabbitorPhone: string | null
  grandTotal: number
  shop: { name: string; address: string }
}

export function CustomerOrderTracking({ orderId }: { orderId: string }) {
  const [mounted, setMounted] = useState(false)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const customerCoordinates = useLocationStore((s) => s.coordinates)
  const { connected, status: liveStatus, riderLocation } = useOrderTrackingSocket(orderId)

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
    } catch {
      /* retry on interval */
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    setMounted(true)
    void syncOrder()
    const interval = setInterval(() => void syncOrder(), 15000)
    return () => clearInterval(interval)
  }, [syncOrder])

  useEffect(() => {
    if (!liveStatus || !order) return
    setOrder((prev) => (prev ? { ...prev, status: liveStatus } : prev))
  }, [liveStatus, order])

  const currentStatus = liveStatus ?? order?.status ?? 'PENDING'
  const destLat =
    order?.destLatitude ??
    customerCoordinates?.lat ??
    order?.shopLat ??
    19.1364
  const destLng =
    order?.destLongitude ??
    customerCoordinates?.lng ??
    order?.shopLng ??
    72.8296

  const eta = useMemo(() => {
    if (currentStatus === 'DELIVERED') {
      return { label: 'Delivered!', arrived: true, minutes: 0 }
    }

    if (riderLocation && currentStatus === 'OUT_FOR_DELIVERY') {
      const result = etaMinutesFromRider(
        riderLocation.lat,
        riderLocation.lng,
        destLat,
        destLng,
      )
      if (result.arrived) {
        return {
          label: 'Rider has arrived near your location!',
          arrived: true,
          minutes: 0,
        }
      }
      return {
        label: `Arriving in ${result.minutes} Mins`,
        arrived: false,
        minutes: result.minutes,
      }
    }

    const fallback = trackingFromOrderStatus(currentStatus)
    return {
      label: `Arriving in ~${fallback.eta} Mins`,
      arrived: false,
      minutes: fallback.eta,
    }
  }, [currentStatus, riderLocation, destLat, destLng])

  const showMap =
    currentStatus === 'OUT_FOR_DELIVERY' || currentStatus === 'DELIVERED'

  if (!mounted || loading) {
    return <TrackingPageSkeleton />
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-bold text-slate-900">Order not found</p>
        <Link
          href="/orders"
          className="mt-6 rounded-2xl bg-[#FF6B35] px-6 py-3 text-sm font-bold text-white"
        >
          Back to Orders
        </Link>
      </div>
    )
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-xl bg-[#F8FAFC] pb-8 font-sans text-slate-900">
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-black">Track Order</h1>
            <p className="text-xs font-semibold text-slate-400">#{order.orderNumber}</p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold',
            connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
          )}
        >
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {connected ? 'Live' : 'Syncing'}
        </span>
      </div>

      <div
        className={cn(
          'mx-4 mt-4 rounded-2xl px-5 py-6 text-center shadow-sm transition-colors duration-500',
          eta.arrived
            ? 'bg-[#0C831F] text-white'
            : 'bg-gradient-to-br from-[#FF6B35] to-[#FF8F65] text-white',
        )}
      >
        <p className="text-xs font-bold uppercase tracking-widest opacity-90">
          {currentStatus === 'DELIVERED' ? 'Completed' : 'Estimated arrival'}
        </p>
        <p className="mt-2 text-2xl font-black sm:text-3xl">{eta.label}</p>
        <p className="mt-2 text-sm font-medium opacity-90">{order.shop.name}</p>
      </div>

      <div className="mx-4 mt-4">
        <TrackingTimeline status={currentStatus} />
      </div>

      {order.rabbitorName && currentStatus !== 'PENDING' && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6B35] text-lg font-black text-white">
            🐰
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-400">Your Rabbitor</p>
            <p className="font-bold text-slate-900">{order.rabbitorName}</p>
          </div>
          {order.rabbitorPhone && (
            <a
              href={`tel:+91${order.rabbitorPhone}`}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0C831F] text-white"
            >
              <Phone className="h-5 w-5" />
            </a>
          )}
        </div>
      )}

      {showMap && (
        <div className="mx-4 mt-4 space-y-3">
          <GoogleOrderMap
            orderId={orderId}
            status={currentStatus}
            shopLat={order.shopLat}
            shopLng={order.shopLng}
            destLat={destLat}
            destLng={destLng}
          />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 shadow-sm"
          >
            <MapPin className="h-4 w-4 text-[#FF6B35]" />
            Open in Google Maps
          </a>
        </div>
      )}

      <div className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Delivering to
        </p>
        <p className="mt-2 text-sm font-medium text-slate-800">{order.deliveryAddress}</p>
        <p className="mt-3 text-sm font-bold text-[#0C831F]">
          Order total {formatCurrency(order.grandTotal)}
        </p>
      </div>
    </div>
  )
}
