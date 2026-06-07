'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  ShieldCheck,
  Smile,
  BellOff,
  Milestone,
  ShoppingBag,
  Banknote,
  Smartphone,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useLocationStore } from '@/store'
import { getDeliveryQuote } from '@/actions/shops'
import { getSessionAction } from '@/actions/auth'
import { SAVED_LOCATIONS } from '@/lib/constants'
import { loadRazorpayScript } from '@/lib/razorpay'
import { AdBanner } from '@/components/ads/AdBanner'

const TIP_OPTIONS = [20, 30, 50, 70]
const DEFAULT_DELIVERY_FEE = 35
const RAZORPAY_ENABLED = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)

type PaymentMethod = 'cod' | 'upi' | 'card'

const PAYMENT_OPTIONS: {
  id: PaymentMethod
  label: string
  description: string
  icon: typeof Banknote
}[] = [
  {
    id: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay when your order arrives',
    icon: Banknote,
  },
  {
    id: 'upi',
    label: 'UPI',
    description: 'Pay instantly via UPI',
    icon: Smartphone,
  },
  {
    id: 'card',
    label: 'Card',
    description: 'Debit or credit card',
    icon: CreditCard,
  },
]

function instructionLabel(key: string | null): string | undefined {
  if (key === 'gate') return 'Leave at Gate'
  if (key === 'bell') return "Don't Ring Bell"
  return undefined
}

export default function DynamicCheckoutPage() {
  const router = useRouter()
  const { items, shopId, total, clearCart, removeItem, hydrated } = useCart()
  const location = useLocationStore((s) => s.location)

  const [selectedTip, setSelectedTip] = useState<number | null>(null)
  const [selectedInstruction, setSelectedInstruction] = useState<string | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(DEFAULT_DELIVERY_FEE)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [destLat, setDestLat] = useState<number | null>(null)
  const [destLng, setDestLng] = useState<number | null>(null)
  const [detectingAddress, setDetectingAddress] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [orderPlacedId, setOrderPlacedId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  const visiblePaymentOptions = PAYMENT_OPTIONS.filter(
    (o) => o.id === 'cod' || RAZORPAY_ENABLED,
  )

  const itemTotal = total()
  const partnerTip = selectedTip ?? 0
  const grandTotal = Math.max(0, itemTotal - discountAmount) + deliveryFee + partnerTip

  const addressLine = deliveryAddress
  const lat = destLat ?? location?.latitude ?? SAVED_LOCATIONS[0].latitude
  const lng = destLng ?? location?.longitude ?? SAVED_LOCATIONS[0].longitude

  const detectDeliveryLocation = () => {
    if (!navigator.geolocation) return
    setDetectingAddress(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setDestLat(latitude)
        setDestLng(longitude)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } },
          )
          const data = await res.json()
          const addr = data.address ?? {}
          const parts = [
            addr.road || addr.pedestrian,
            addr.suburb || addr.neighbourhood,
            addr.city || addr.town,
            addr.postcode,
          ].filter(Boolean)
          setDeliveryAddress(parts.join(', '))
        } catch {
          setDeliveryAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        }
        setDetectingAddress(false)
      },
      () => setDetectingAddress(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Pre-fill address from saved location
  useEffect(() => {
    if (!deliveryAddress && location?.label) {
      setDeliveryAddress(location.label)
      if (location.latitude) setDestLat(location.latitude)
      if (location.longitude) setDestLng(location.longitude)
    }
  }, [location, deliveryAddress])
  const shopBackHref = shopId ? `/shops/${shopId}` : '/'

  useEffect(() => {
    getSessionAction().then((session) => {
      setAuthChecked(true)
      if (!session) router.push('/auth?redirect=/checkout')
    })
  }, [router])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  useEffect(() => {
    if (!shopId || items.length === 0) return
    getDeliveryQuote({ shopId, lat, lng, subtotal: itemTotal })
      .then((q) => setDeliveryFee(q.deliveryFee))
      .catch(() => setDeliveryFee(DEFAULT_DELIVERY_FEE))
  }, [shopId, lat, lng, itemTotal, items.length])

  useEffect(() => {
    if (!hydrated || !shopId || items.length === 0) return

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/products?shopId=${encodeURIComponent(shopId)}`)
        const json = await res.json()
        if (!json.success || cancelled) return

        const validIds = new Set(
          (json.data as Array<{ id: string; isAvailable: boolean }>)
            .filter((p) => p.isAvailable)
            .map((p) => p.id),
        )

        const stale = items.filter((item) => !validIds.has(item.productId))
        if (stale.length > 0 && !cancelled) {
          stale.forEach((item) => removeItem(item.productId))
          setError(
            'Some items in your cart are no longer available and were removed. Add items again from the shop.',
          )
        }
      } catch {
        // ignore validation errors — order API will validate again
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hydrated, shopId, items, removeItem])

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setApplyingCoupon(true)
    setCouponError(null)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), cartTotal: itemTotal }),
      })
      const json = await res.json()
      if (!json.success) {
        setAppliedCoupon(null)
        setDiscountAmount(0)
        setCouponError(json.error ?? 'Invalid coupon')
        return
      }
      setAppliedCoupon(json.data.code as string)
      setDiscountAmount(json.data.discountAmount as number)
    } catch {
      setCouponError('Could not validate coupon')
    } finally {
      setApplyingCoupon(false)
    }
  }

  const finishOrder = (orderId: string, placedOrderNumber?: string) => {
    setOrderPlacedId(orderId)
    if (placedOrderNumber) setOrderNumber(placedOrderNumber)
    router.replace(`/track/${orderId}`)
  }

  const orderPayload = {
    shopId,
    deliveryFee,
    riderTip: partnerTip,
    address: addressLine,
    instruction: instructionLabel(selectedInstruction),
    destLatitude: lat,
    destLongitude: lng,
    couponCode: appliedCoupon ?? undefined,
    paymentMethod,
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    })),
  }

  const handlePlaceOrder = async () => {
    if (items.length === 0 || !shopId) return
    if (!deliveryAddress.trim()) {
      setError('Please enter a delivery address.')
      return
    }
    setIsPlacing(true)
    setError(null)

    let method = paymentMethod
    if ((method === 'upi' || method === 'card') && !RAZORPAY_ENABLED) {
      setToast('Online payment not available. Defaulting to Cash on Delivery.')
      method = 'cod'
    }

    const payload = { ...orderPayload, address: deliveryAddress.trim(), paymentMethod: method }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await response.json()
      if (!json.success) {
        if (response.status === 401) {
          setError(json.error ?? 'Please log in again.')
          router.push('/auth?redirect=/checkout')
          return
        }
        setError(json.error ?? 'Order failed. Please try again.')
        return
      }

      const orderId = json.orderId as string
      const placedNum = json.orderNumber as string | undefined

      if (method === 'cod') {
        finishOrder(orderId, placedNum)
        return
      }

      try {
        const paymentRes = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const paymentJson = await paymentRes.json()

        if (!paymentJson.success) {
          finishOrder(orderId, placedNum)
          return
        }

        const paymentData = paymentJson.data as {
          razorpayOrderId: string
          amount: number
          currency: string
          key: string
        }

        const razorpayKey =
          paymentData.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ''
        if (!razorpayKey) {
          finishOrder(orderId, placedNum)
          return
        }

        const scriptLoaded = await loadRazorpayScript()
        if (!scriptLoaded) {
          finishOrder(orderId, placedNum)
          return
        }

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: razorpayKey,
            amount: paymentData.amount,
            currency: paymentData.currency,
            name: 'Rabbit',
            description: 'Order payment',
            order_id: paymentData.razorpayOrderId,
            theme: { color: '#FF6B35' },
            handler: async (razorpayResponse) => {
              try {
                const verifyRes = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpayOrderId: razorpayResponse.razorpay_order_id,
                    razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                    razorpaySignature: razorpayResponse.razorpay_signature,
                  }),
                })
                const verifyJson = await verifyRes.json()
                if (!verifyJson.success) {
                  reject(new Error(verifyJson.error?.message ?? verifyJson.error ?? 'Payment verification failed'))
                  return
                }
                finishOrder(orderId, placedNum)
                resolve()
              } catch (err) {
                reject(err)
              }
            },
            modal: {
              ondismiss: () => reject(new Error('Payment cancelled')),
            },
          })
          rzp.open()
        })
      } catch {
        finishOrder(orderId, placedNum)
      }
    } catch (err) {
      console.error('Order processing failed:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsPlacing(false)
    }
  }

  if (!hydrated || !authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm font-bold text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading basket…
      </div>
    )
  }

  if (orderPlacedId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-6 font-sans text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-12 w-12 text-[#0C831F]" />
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-900">Order Placed! 🐰</h1>
        {orderNumber && (
          <p className="mt-2 text-sm font-semibold text-[#FF6B35]">#{orderNumber}</p>
        )}
        <p className="mt-2 text-sm text-slate-500">Taking you to live order tracking…</p>
        <Loader2 className="mt-6 h-6 w-6 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  if (items.length === 0 && !isPlacing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 font-sans">
        <ShoppingBag className="h-12 w-12 text-slate-300" />
        <p className="mt-4 text-slate-600">Your cart is empty</p>
        <Link href="/" className="mt-4 font-semibold text-[#FF6B35]">
          Browse shops
        </Link>
      </div>
    )
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-xl bg-[#F8FAFC] pb-32 font-sans shadow-2xl">
      <div className="sticky top-0 z-50 flex items-center gap-4 border-b bg-white px-4 py-4 shadow-sm">
        <Link
          href={shopBackHref}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-base font-black text-slate-900">Secure Checkout</h2>
          <p className="text-[10px] font-bold uppercase text-slate-400">
            Dynamic Basket Verification
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-start gap-4 rounded-[2rem] border bg-white p-5 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#FF6B35]/10 bg-[#FFF8F5] text-[#FF6B35]">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Delivery Address</h3>
              <button
                type="button"
                onClick={detectDeliveryLocation}
                disabled={detectingAddress}
                className="flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-xs font-bold text-[#FF6B35]"
              >
                {detectingAddress
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Detecting...</>
                  : <><MapPin className="h-3 w-3" /> Use GPS</>
                }
              </button>
            </div>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={2}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#FF6B35] focus:outline-none"
              placeholder="House no, Street, Area, City"
            />
            {destLat && (
              <p className="text-[10px] text-green-600">✓ GPS coordinates captured for accurate delivery</p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-[2rem] border bg-white p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Your Basket
          </h3>
          <div className="divide-y divide-slate-50">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex justify-between py-2.5 text-xs font-bold"
              >
                <span className="text-slate-800">
                  {item.name}{' '}
                  <span className="text-slate-400">x{item.quantity}</span>
                </span>
                <span className="text-slate-950">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-[2rem] border bg-white p-5 shadow-xs">
          <div className="flex items-center gap-1.5">
            <Smile className="h-4 w-4 text-[#FF6B35]" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Tip your delivery partner
            </h3>
          </div>
          <div className="flex gap-2.5">
            {TIP_OPTIONS.map((tip) => (
              <button
                key={tip}
                type="button"
                onClick={() => setSelectedTip(selectedTip === tip ? null : tip)}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-black transition-all ${
                  selectedTip === tip
                    ? 'border-[#FF6B35] bg-[#FF6B35] text-white'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                ₹{tip}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-[2rem] border bg-white p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Delivery Instructions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedInstruction(selectedInstruction === 'gate' ? null : 'gate')}
              className={`flex h-20 flex-col justify-between rounded-2xl border p-3 text-left transition-all ${
                selectedInstruction === 'gate'
                  ? 'border-[#FF6B35] bg-[#FFF8F5]'
                  : 'border-slate-100 bg-slate-50/50'
              }`}
            >
              <Milestone
                className={`h-4 w-4 ${selectedInstruction === 'gate' ? 'text-[#FF6B35]' : 'text-slate-400'}`}
              />
              <span className="text-[11px] font-extrabold tracking-tight text-slate-700">
                Leave at Gate
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedInstruction(selectedInstruction === 'bell' ? null : 'bell')}
              className={`flex h-20 flex-col justify-between rounded-2xl border p-3 text-left transition-all ${
                selectedInstruction === 'bell'
                  ? 'border-[#FF6B35] bg-[#FFF8F5]'
                  : 'border-slate-100 bg-slate-50/50'
              }`}
            >
              <BellOff
                className={`h-4 w-4 ${selectedInstruction === 'bell' ? 'text-[#FF6B35]' : 'text-slate-400'}`}
              />
              <span className="text-[11px] font-extrabold tracking-tight text-slate-700">
                Don&apos;t Ring Bell
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-[2rem] border bg-white p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Coupon Code
          </h3>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold uppercase"
            />
            <button
              type="button"
              onClick={() => void handleApplyCoupon()}
              disabled={applyingCoupon || !couponCode.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase text-white disabled:opacity-40"
            >
              {applyingCoupon ? '…' : 'Apply'}
            </button>
          </div>
          {couponError && (
            <p className="text-xs font-semibold text-red-600">{couponError}</p>
          )}
          {appliedCoupon && discountAmount > 0 && (
            <p className="text-xs font-bold text-emerald-700">
              {appliedCoupon} applied — you save ₹{discountAmount}
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-[2rem] border bg-white p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Payment Method
          </h3>
          <div className="space-y-2">
            {visiblePaymentOptions.map((option) => {
              const Icon = option.icon
              const selected = paymentMethod === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                    selected
                      ? 'border-[#FF6B35] bg-[#FFF8F5]'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      selected ? 'bg-[#FF6B35] text-white' : 'bg-white text-slate-500'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{option.label}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{option.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {paymentMethod === 'cod' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Pay on Delivery — you&apos;ll pay ₹{grandTotal} in cash when your order arrives.
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-[2rem] border bg-white p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Bill Details
          </h3>
          <div className="space-y-2.5 text-xs font-bold text-slate-600">
            <div className="flex justify-between">
              <span>Item Total</span>
              <span className="font-extrabold text-slate-900">₹{itemTotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Coupon Discount</span>
                <span className="font-extrabold">-₹{discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Partner Fee</span>
              <span className="font-extrabold text-slate-900">₹{deliveryFee}</span>
            </div>
            {partnerTip > 0 && (
              <div className="flex justify-between text-[#FF6B35]">
                <span>Delivery Boy Tip</span>
                <span className="font-extrabold">₹{partnerTip}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 text-sm font-black text-slate-950">
              <span>To Pay</span>
              <span className="text-lg text-[#FF6B35]">₹{grandTotal}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-extrabold text-emerald-800">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Rabbit Safety Pledge: Freshly sealed packs, completely contactless dispatch.</span>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600">{error}</p>
        )}
        {toast && (
          <p className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl bg-[#0C831F] px-4 py-3 text-center text-sm font-bold text-white shadow-lg">
            {toast}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl border-t bg-white p-4 shadow-md">
        <AdBanner placement="CHECKOUT_PAGE" className="mb-3 h-20 w-full" />
        <button
          type="button"
          onClick={() => void handlePlaceOrder()}
          disabled={isPlacing || items.length === 0 || !deliveryAddress.trim()}
          className="flex w-full items-center justify-between rounded-2xl bg-[#FF6B35] px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl disabled:bg-slate-300 disabled:shadow-none"
        >
          <span className="text-base font-black">₹{grandTotal}</span>
          <span className="flex items-center gap-1.5">
            {isPlacing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : paymentMethod === 'cod' ? (
              <>
                Place Order · Pay on Delivery <Banknote className="h-4 w-4" />
              </>
            ) : (
              <>
                Pay Now <CreditCard className="h-4 w-4" />
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  )
}
