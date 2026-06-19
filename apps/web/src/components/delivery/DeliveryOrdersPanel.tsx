'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  MapPin,
  Navigation,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  acceptDeliveryOfferAction,
  getActiveDeliveryAction,
  getRiderRealtimeAuthAction,
  setRiderDutyAction,
  updateRiderStageAction,
  type ActiveDelivery,
  type RiderStage,
} from '@/actions/delivery'
import { SwipeActionButton } from '@/components/delivery/SwipeActionButton'
import { useRiderLocationStream } from '@/hooks/useRiderLocationStream'
import { useRiderSocket, type DeliveryAssignedEvent, type DeliveryOfferEvent } from '@/hooks/useRiderSocket'
import { formatCurrency, cn } from '@/lib/utils'

const ACTIVE_ORDER_KEY = 'rabbit:active-delivery-id'
const DUTY_KEY = 'rabbit:rider-online'

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

function OfferCountdown({
  seconds,
  onExpire,
}: {
  seconds: number
  onExpire: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
    const started = Date.now()
    const id = window.setInterval(() => {
      const left = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000))
      setRemaining(left)
      if (left <= 0) onExpire()
    }, 250)
    return () => window.clearInterval(id)
  }, [seconds, onExpire])

  return (
    <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold tabular-nums text-orange-700">
      {remaining}s
    </span>
  )
}

export function DeliveryOrdersPanel() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null)
  const [pendingOffer, setPendingOffer] = useState<DeliveryOfferEvent | null>(null)
  const [pickupVerified, setPickupVerified] = useState(false)
  const [socketToken, setSocketToken] = useState<string | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [lastGpsAt, setLastGpsAt] = useState<number | null>(null)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const lastEmitRef = useRef(0)

  const persistActive = useCallback((orderId: string | null) => {
    if (typeof window === 'undefined') return
    if (orderId) sessionStorage.setItem(ACTIVE_ORDER_KEY, orderId)
    else sessionStorage.removeItem(ACTIVE_ORDER_KEY)
  }, [])

  const loadActive = useCallback(async () => {
    const delivery = await getActiveDeliveryAction()
    setActiveDelivery(delivery)
    persistActive(delivery?.id ?? null)
    setLoading(false)
  }, [persistActive])

  useEffect(() => {
    setMounted(true)
    const savedDuty = sessionStorage.getItem(DUTY_KEY) === '1'
    setIsOnline(savedDuty)
    void loadActive()
    getRiderRealtimeAuthAction().then((res) => {
      if (res.ok) setSocketToken(res.token)
    })
  }, [loadActive])

  const handleOffer = useCallback((offer: DeliveryOfferEvent) => {
    if (activeDelivery) return
    setPendingOffer(offer)
  }, [activeDelivery])

  const handleAssigned = useCallback(
    async (_assignment: DeliveryAssignedEvent) => {
      if (activeDelivery) return
      const delivery = await getActiveDeliveryAction()
      if (delivery) {
        setActiveDelivery(delivery)
        persistActive(delivery.id)
        setPendingOffer(null)
        setPickupVerified(false)
      }
    },
    [activeDelivery, persistActive],
  )

  const { connectionState, joinError, emitLocation } = useRiderSocket(
    socketToken,
    isOnline,
    handleOffer,
    handleAssigned,
    (payload) => {
      setFeedbackToast(`Customer rated delivery ★${payload.riderRating}`)
      window.setTimeout(() => setFeedbackToast(null), 8000)
    },
  )

  // GOOGLE MAPS & AUTH ACTIVATION — persist rider coords to DB during active delivery
  useRiderLocationStream({
    orderId: activeDelivery?.id,
    enabled: Boolean(activeDelivery),
    onError: (msg) => setGpsError(msg),
  })

  const toggleDuty = async () => {
    const next = !isOnline
    setBusy(true)
    const res = await setRiderDutyAction(next)
    setBusy(false)
    if (!res.ok) return
    setIsOnline(next)
    sessionStorage.setItem(DUTY_KEY, next ? '1' : '0')
  }

  const acceptOffer = async () => {
    if (!pendingOffer) return
    setBusy(true)
    const res = await acceptDeliveryOfferAction(pendingOffer.orderId)
    setBusy(false)
    if (!res.ok) return
    setActiveDelivery(res.delivery)
    persistActive(res.delivery.id)
    setPendingOffer(null)
    setPickupVerified(false)
  }

  const advanceStage = async (stage: RiderStage) => {
    if (!activeDelivery) return
    setBusy(true)
    const res = await updateRiderStageAction(activeDelivery.id, stage)
    setBusy(false)
    if (!res.ok) return

    if (stage === 'DELIVERED') {
      setActiveDelivery(null)
      persistActive(null)
      setPickupVerified(false)
      return
    }

    setActiveDelivery((prev) =>
      prev ? { ...prev, riderStage: stage, status: res.status ?? prev.status } : prev,
    )
  }

  useEffect(() => {
    if (!mounted || !activeDelivery?.id || !navigator.geolocation) return

    const orderId = activeDelivery.id

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setGpsError(null)
        const now = Date.now()
        if (now - lastEmitRef.current >= 8000) {
          lastEmitRef.current = now
          emitLocation(orderId, lat, lng)
          setLastGpsAt(now)
        }
      },
      (err) => setGpsError(err.message || 'GPS unavailable'),
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [mounted, activeDelivery?.id, emitLocation])

  if (!mounted || loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    )
  }

  const stage = activeDelivery?.riderStage ?? 'ASSIGNED'
  const destination =
    stage === 'PICKED_UP' && activeDelivery?.destLat && activeDelivery?.destLng
      ? { lat: activeDelivery.destLat, lng: activeDelivery.destLng, label: 'Customer' }
      : activeDelivery
        ? {
            lat: activeDelivery.shopLat,
            lng: activeDelivery.shopLng,
            label: activeDelivery.shopName,
          }
        : null

  return (
    <div className="space-y-6 pb-28">
      {feedbackToast && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          {feedbackToast}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/delivery/dashboard" className="text-sm text-gray-500 hover:text-orange-500">
            ← Jobs hub
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Active Delivery</h1>
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
            connectionState === 'connected'
              ? 'bg-orange-50 text-orange-600'
              : 'bg-gray-100 text-gray-500',
          )}
        >
          {connectionState === 'connected' ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
          {connectionState === 'connected' ? 'Live' : joinError ?? 'Reconnecting'}
        </div>
      </div>

      {!activeDelivery ? (
        <section className="rounded-3xl border border-orange-100 bg-orange-50/30 p-6">
          <p className="text-sm text-gray-500">Duty status</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{isOnline ? 'ONLINE' : 'OFFLINE'}</p>
              <p className="mt-1 text-sm text-gray-500">
                {isOnline
                  ? 'Listening for delivery offers near you'
                  : 'Go online to receive delivery offers'}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleDuty()}
              className={cn(
                'relative h-14 w-28 rounded-full transition-colors',
                isOnline ? 'bg-orange-500' : 'bg-gray-300',
              )}
              aria-pressed={isOnline}
            >
              <span
                className={cn(
                  'absolute top-1 h-12 w-12 rounded-full bg-white shadow transition-transform',
                  isOnline ? 'translate-x-14' : 'translate-x-1',
                )}
              />
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                Active task
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">{activeDelivery.orderNumber}</p>
              <p className="text-sm text-gray-500">{activeDelivery.shopName}</p>
            </div>
            <p className="text-lg font-bold text-orange-500">
              {formatCurrency(activeDelivery.payoutInr)}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Radio
                className={cn(
                  'h-4 w-4',
                  lastGpsAt ? 'animate-pulse text-orange-500' : 'text-gray-400',
                )}
              />
              {lastGpsAt
                ? 'GPS broadcasting every 8 seconds'
                : 'Waiting for GPS lock…'}
            </div>
            {gpsError && <p className="mt-2 text-xs text-red-600">{gpsError}</p>}
          </div>

          {destination && (
            <div className="rounded-2xl border border-orange-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Navigate to {destination.label}
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {stage === 'PICKED_UP'
                  ? activeDelivery.deliveryAddress
                  : activeDelivery.shopAddress}
              </p>
              <div className="mt-4 flex h-36 items-center justify-center rounded-xl border border-dashed border-orange-200 bg-orange-50/50 text-sm text-gray-500">
                Map preview
              </div>
              <a
                href={mapsUrl(destination.lat, destination.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600"
              >
                <Navigation className="h-4 w-4" />
                Open in Google Maps
              </a>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            Step{' '}
            {stage === 'ASSIGNED'
              ? '1 — Arrive at store'
              : stage === 'ARRIVED_AT_STORE'
                ? '2 — Confirm pickup'
                : '3 — Complete delivery'}
          </div>
        </section>
      )}

      {activeDelivery && (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-lg px-4">
          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-lg">
            {stage === 'ASSIGNED' && (
              <SwipeActionButton
                label="Swipe to Arrive at Store"
                disabled={busy}
                onConfirm={() => void advanceStage('ARRIVED_AT_STORE')}
              />
            )}

            {stage === 'ARRIVED_AT_STORE' && (
              <div className="space-y-3">
                <label className="flex min-h-[48px] items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/30 px-4 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={pickupVerified}
                    onChange={(e) => setPickupVerified(e.target.checked)}
                    className="h-5 w-5 accent-orange-500"
                  />
                  <span>I verified all items in the bag</span>
                </label>
                <button
                  type="button"
                  disabled={!pickupVerified || busy}
                  onClick={() => void advanceStage('PICKED_UP')}
                  className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-40"
                >
                  Confirm Pickup
                </button>
              </div>
            )}

            {stage === 'PICKED_UP' && (
              <SwipeActionButton
                label="Swipe — Order Complete"
                tone="orange"
                disabled={busy}
                onConfirm={() => void advanceStage('DELIVERED')}
              />
            )}
          </div>
        </div>
      )}

      {pendingOffer && !activeDelivery && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
                  New delivery offer
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">{pendingOffer.storeName}</h2>
              </div>
              <OfferCountdown
                seconds={pendingOffer.expiresInSeconds}
                onExpire={() => setPendingOffer(null)}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">{pendingOffer.orderNumber}</p>
            <p className="mt-4 text-3xl font-bold text-orange-500">
              {formatCurrency(pendingOffer.payoutInr)}
            </p>
            <p className="mt-1 text-sm text-gray-500">Estimated payout (fee + tip)</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingOffer(null)}
                className="min-h-[52px] rounded-2xl border border-orange-100 text-sm font-bold text-gray-700"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void acceptOffer()}
                className="min-h-[52px] rounded-2xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        </div>
      )}
    </div>
  )
}
