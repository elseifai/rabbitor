'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import {
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Smile,
  BellOff,
  Milestone,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { getDeliveryQuote, getMultiShopDeliveryQuote } from '@/actions/shops'
import { DevRoleLoginPanel } from '@/components/auth/DevRoleLoginPanel'
import { OrderSuccessScreen } from '@/components/checkout/OrderSuccessScreen'
import {
  CheckoutAddressSection,
  type CustomerAddressRecord,
} from '@/components/checkout/CheckoutAddressSection'
import { ConfirmDeliveryLocationModal } from '@/components/checkout/ConfirmDeliveryLocationModal'
import { formatCustomerAddress } from '@/lib/customer-address'
import { isDevSandboxClient } from '@/lib/dev-auth'
import { useAuth } from '@/context/AuthContext'
import { loadRazorpayScript } from '@/lib/razorpay'
import { resolveAppApiUrl } from '@/lib/app-api'
import { authFetch } from '@/lib/session'
import { getSession as getClientSession } from '@/lib/session'
import { AdBanner } from '@/components/ads/AdBanner'

const TIP_OPTIONS = [20, 30, 50, 70]
const DEFAULT_DELIVERY_FEE = 35

function instructionLabel(key: string | null): string | undefined {
  if (key === 'gate') return 'Leave at Gate'
  if (key === 'bell') return "Don't Ring Bell"
  return undefined
}

export default function DynamicCheckoutPage() {
  const router = useRouter()
  const { isLoggedIn, hydrated: authHydrated } = useAuth()
  const { items, shopIds, itemsByShop, total, subtotalForShop, clearCart, removeItem, hydrated } = useCart()
  const sandbox = isDevSandboxClient()

  const [selectedTip, setSelectedTip] = useState<number | null>(null)
  const [selectedInstruction, setSelectedInstruction] = useState<string | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(DEFAULT_DELIVERY_FEE)
  const [multiShopRoutingFee, setMultiShopRoutingFee] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddressRecord | null>(null)
  const [hasDeliveryAddress, setHasDeliveryAddress] = useState(false)
  const [showConfirmLocation, setShowConfirmLocation] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [orderPlacedId, setOrderPlacedId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [paymentEnabled, setPaymentEnabled] = useState<boolean | null>(null)
  const [runtimeRazorpayKey, setRuntimeRazorpayKey] = useState('')

  const itemTotal = total()
  const partnerTip = selectedTip ?? 0
  const grandTotal = Math.max(0, itemTotal - discountAmount) + deliveryFee + partnerTip

  const deliveryAddress = selectedAddress ? formatCustomerAddress(selectedAddress) : ''
  const lat = selectedAddress?.latitude ?? 19.1364
  const lng = selectedAddress?.longitude ?? 72.8296
  const shopBackHref = shopIds.length === 1 ? `/shops/${shopIds[0]}` : '/cart'

  // DEV SANDBOX REFACTOR — trust localStorage + AuthContext; avoid re-prompting when session exists.
  useEffect(() => {
    if (!authHydrated) return
    const hasClientSession = Boolean(getClientSession())
    setNeedsAuth(!(isLoggedIn || hasClientSession))
  }, [authHydrated, isLoggedIn])

  useEffect(() => {
    if (authHydrated && needsAuth && !sandbox) {
      router.push('/auth?redirect=/checkout')
    }
  }, [authHydrated, needsAuth, sandbox, router])

  useEffect(() => {
    let cancelled = false
    void fetch(resolveAppApiUrl('/api/payments/config'), { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json.success) return
        setPaymentEnabled(Boolean(json.data?.enabled))
        setRuntimeRazorpayKey(String(json.data?.key ?? ''))
      })
      .catch(() => {
        if (!cancelled) setPaymentEnabled(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (items.length === 0 || shopIds.length === 0) return
    const shopPayload = shopIds.map((id) => ({
      shopId: id,
      subtotal: items
        .filter((i) => i.storeId === id)
        .reduce((sum, i) => sum + i.price * i.quantity, 0),
    }))
    getMultiShopDeliveryQuote({ shops: shopPayload, lat, lng })
      .then((q) => {
        setDeliveryFee(q.totalDeliveryFee)
        setMultiShopRoutingFee(q.multiShopRoutingFee)
      })
      .catch(() => setDeliveryFee(DEFAULT_DELIVERY_FEE))
  }, [shopIds, lat, lng, items])

  useEffect(() => {
    if (!hydrated || items.length === 0) return

    let cancelled = false
    void (async () => {
      try {
        for (const shopId of shopIds) {
          const shopItems = itemsByShop[shopId] ?? []
          if (shopItems.length === 0) continue

          const res = await fetch(`/api/products?shopId=${encodeURIComponent(shopId)}`)
          const json = await res.json()
          if (!json.success || cancelled) return

          const validIds = new Set(
            (json.data as Array<{ id: string; isAvailable: boolean }>)
              .filter((p) => p.isAvailable)
              .map((p) => p.id),
          )

          const stale = shopItems.filter((item) => !validIds.has(item.id))
          if (stale.length > 0 && !cancelled) {
            stale.forEach((item) => removeItem(item.id))
            setError(
              'Some items in your cart are no longer available and were removed.',
            )
          }
        }
      } catch {
        // ignore validation errors — order API will validate again
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hydrated, shopIds, itemsByShop, items.length, removeItem])

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
    clearCart()
    setOrderPlacedId(orderId)
    if (placedOrderNumber) setOrderNumber(placedOrderNumber)
  }

  const goToTracking = useCallback(() => {
    if (!orderPlacedId) return
    router.replace(`/track/${orderPlacedId}`)
  }, [orderPlacedId, router])

  const markPaymentFailed = async (intentId: string, reason: string) => {
    try {
      await authFetch(
        resolveAppApiUrl('/api/payments/fail'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intentId, reason }),
        },
        { skipLogoutRedirect: true },
      )
    } catch {
      // Best-effort cleanup — webhook may still mark the intent failed.
    }
  }

  const checkoutPayload = {
    riderTip: partnerTip,
    address: deliveryAddress,
    instruction: instructionLabel(selectedInstruction),
    destLatitude: lat,
    destLongitude: lng,
    couponCode: appliedCoupon ?? undefined,
    shops: shopIds.map((shopId) => ({
      shopId,
      items: (itemsByShop[shopId] ?? []).map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
    })),
  }

  const handlePlaceOrder = async () => {
    if (items.length === 0 || shopIds.length === 0) return
    if (!selectedAddress || !deliveryAddress.trim()) {
      setError('Please add and select a delivery address.')
      return
    }
    if (!paymentEnabled) {
      setError('Online payment is temporarily unavailable. Please try again later.')
      return
    }

    setIsPlacing(true)
    setError(null)

    const payload = { ...checkoutPayload, address: deliveryAddress.trim() }
    let activeIntentId: string | null = null

    try {
      const intentRes = await authFetch(
        resolveAppApiUrl('/api/payments/intent'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        { skipLogoutRedirect: true },
      )

      const intentJson = await intentRes.json()
      if (!intentJson.success) {
        if (intentRes.status === 401) {
          setError(intentJson.error ?? 'Please log in again.')
          if (sandbox) {
            setNeedsAuth(true)
            return
          }
          router.push('/auth?redirect=/checkout')
          return
        }
        setError(intentJson.error ?? 'Could not start payment. Please try again.')
        return
      }

      const paymentData = intentJson.data as {
        intentId: string
        razorpayOrderId: string
        amount: number
        currency: string
        key: string
      }
      activeIntentId = paymentData.intentId

      const razorpayKey =
        paymentData.key ||
        runtimeRazorpayKey ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        ''
      if (!razorpayKey) {
        await markPaymentFailed(paymentData.intentId, 'Razorpay is not configured')
        setError('Online payment is temporarily unavailable. Please try again later.')
        return
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        await markPaymentFailed(paymentData.intentId, 'Could not load payment gateway')
        setError('Could not load payment gateway. Please try again.')
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
              const confirmRes = await authFetch(
                resolveAppApiUrl('/api/payments/confirm'),
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpayOrderId: razorpayResponse.razorpay_order_id,
                    razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                    razorpaySignature: razorpayResponse.razorpay_signature,
                  }),
                },
                { skipLogoutRedirect: true },
              )
              const confirmJson = await confirmRes.json()
              if (!confirmJson.success) {
                reject(
                  new Error(
                    confirmJson.error?.message ?? confirmJson.error ?? 'Payment confirmation failed',
                  ),
                )
                return
              }
              const confirmedOrderId = confirmJson.data.orderId as string
              const confirmedOrderNumber = confirmJson.data.orderNumber as string | undefined
              finishOrder(confirmedOrderId, confirmedOrderNumber)
              resolve()
            } catch (err) {
              reject(err)
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        })
        rzp.on('payment.failed', () => {
          reject(new Error('Payment failed. Please try again.'))
        })
        rzp.open()
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.'
      if (activeIntentId) {
        await markPaymentFailed(activeIntentId, message)
      }
      setError(message)
    } finally {
      setIsPlacing(false)
      setShowConfirmLocation(false)
    }
  }

  const requestPlaceOrder = () => {
    if (!selectedAddress || !deliveryAddress.trim()) {
      setError('Please add and select a delivery address.')
      return
    }
    if (!paymentEnabled) {
      setError('Online payment is temporarily unavailable. Please try again later.')
      return
    }
    setError(null)
    setShowConfirmLocation(true)
  }

  const paymentConfirmLabel = 'Pay now'

  if (!hydrated || !authHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm font-bold text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading basket…
      </div>
    )
  }

  if (needsAuth && sandbox) {
    return (
      <DevRoleLoginPanel
        mode="checkout"
        highlightRole="customer"
        redirectOnSuccess={false}
        onSuccess={() => setNeedsAuth(false)}
      />
    )
  }

  if (needsAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm font-bold text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Redirecting to sign in…
      </div>
    )
  }

  if (orderPlacedId) {
    return (
      <OrderSuccessScreen
        orderNumber={orderNumber}
        onComplete={goToTracking}
      />
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
        <CheckoutAddressSection
          selectedId={selectedAddress?.id ?? null}
          onSelect={setSelectedAddress}
          onAddressResolved={setHasDeliveryAddress}
        />

        <div className="space-y-3 rounded-[2rem] border bg-white p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Your Basket
          </h3>
          <div className="divide-y divide-slate-50">
            {items.map((item) => (
              <div
                key={item.id}
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
            Payment
          </h3>
          <div className="flex items-start gap-3 rounded-2xl border border-[#FF6B35]/20 bg-[#FFF8F5] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B35] text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Pay online to confirm your order</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                UPI, cards, netbanking and wallets via Razorpay. Your order is placed only after
                successful payment.
              </p>
            </div>
          </div>
          {paymentEnabled === false && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Online payment is temporarily unavailable. Checkout is disabled until payment is
              restored.
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
            {multiShopRoutingFee > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Store delivery fees</span>
                  <span className="font-extrabold text-slate-900">₹{deliveryFee - multiShopRoutingFee}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Multi-store routing</span>
                  <span className="font-extrabold text-slate-900">₹{multiShopRoutingFee}</span>
                </div>
              </>
            )}
            {multiShopRoutingFee <= 0 && (
              <div className="flex justify-between">
                <span>Delivery Partner Fee</span>
                <span className="font-extrabold text-slate-900">₹{deliveryFee}</span>
              </div>
            )}
            {multiShopRoutingFee > 0 && (
              <div className="flex justify-between border-t border-dashed pt-2">
                <span>Total delivery</span>
                <span className="font-extrabold text-slate-900">₹{deliveryFee}</span>
              </div>
            )}
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
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl border-t bg-white p-4 shadow-md">
        <AdBanner placement="CHECKOUT_PAGE" className="mb-3 h-20 w-full" />
        <button
          type="button"
          onClick={requestPlaceOrder}
          disabled={
            isPlacing ||
            items.length === 0 ||
            !hasDeliveryAddress ||
            paymentEnabled !== true
          }
          className="flex w-full items-center justify-between rounded-2xl bg-[#FF6B35] px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl disabled:bg-slate-300 disabled:shadow-none"
        >
          <span className="text-base font-black">₹{grandTotal}</span>
          <span className="flex items-center gap-1.5">
            {isPlacing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay &amp; Place Order <CreditCard className="h-4 w-4" />
              </>
            )}
          </span>
        </button>
      </div>

      <ConfirmDeliveryLocationModal
        open={showConfirmLocation}
        address={selectedAddress}
        grandTotal={grandTotal}
        paymentLabel={paymentConfirmLabel}
        isPlacing={isPlacing}
        onConfirm={() => void handlePlaceOrder()}
        onChangeAddress={() => setShowConfirmLocation(false)}
        onClose={() => !isPlacing && setShowConfirmLocation(false)}
      />
    </div>
  )
}
