'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import {
  Loader2,
  ChevronRight,
  ChevronDown,
  WifiOff,
  Tag,
  Ticket,
  CreditCard,
  ShieldCheck,
  Smile,
  BellOff,
  Milestone,
  ShoppingBag,
  ArrowLeft,
} from 'lucide-react'
import { getDeliveryQuote, getMultiShopDeliveryQuote } from '@/actions/shops'
import { DevRoleLoginPanel } from '@/components/auth/DevRoleLoginPanel'
import { OrderSuccessScreen } from '@/components/checkout/OrderSuccessScreen'
import {
  CheckoutAddressSection,
  type CustomerAddressRecord,
} from '@/components/checkout/CheckoutAddressSection'
import { addressLabelDisplay, formatAddressShort } from '@/lib/customer-address'
import { ConfirmDeliveryLocationModal } from '@/components/checkout/ConfirmDeliveryLocationModal'
import { CompleteYourBasket } from '@/components/checkout/CompleteYourBasket'
import { PaymentSheetDrawer } from '@/components/checkout/PaymentSheetDrawer'
import { StoreFulfillmentModal } from '@/components/checkout/StoreFulfillmentModal'
import { formatCustomerAddress } from '@/lib/customer-address'
import { buildUpiPayUrl, getMerchantUpiVpa } from '@/lib/upi-deep-link'
import { isDevSandboxClient } from '@/lib/dev-auth'
import { useAuth } from '@/context/AuthContext'
import { loadRazorpayScript } from '@/lib/razorpay'
import { resolveAppApiUrl } from '@/lib/app-api'
import { authFetch } from '@/lib/session'
import { getSession as getClientSession } from '@/lib/session'
import { ensureCustomerCheckoutSession } from '@/lib/checkout-auth'
import { fetchCurrentAuth } from '@/lib/client-auth'
import { isEssentialsStoreId } from '@/lib/essentials-catalog'
import { AdBanner } from '@/components/ads/AdBanner'
import { useCartStore } from '@/store/useCartStore'
import type { FulfillmentStore } from '@/app/api/stores/fulfillment/route'

const TIP_OPTIONS = [20, 30, 50, 70]
const DEFAULT_DELIVERY_FEE = 35
const LIST_HANDLING_FEE = 4
const LIST_LATE_NIGHT_FEE = 6

type PaymentMethod = 'online' | 'cod'
type OnlinePayMode = 'upi' | 'card' | 'netbanking' | 'bnpl'

const billSpring = { type: 'spring' as const, stiffness: 420, damping: 26 }

function instructionLabel(key: string | null): string | undefined {
  if (key === 'gate') return 'Leave at Gate'
  if (key === 'bell') return "Don't Ring Bell"
  return undefined
}

export default function DynamicCheckoutPage() {
  const router = useRouter()
  const { isLoggedIn, hydrated: authHydrated, login } = useAuth()
  const { items, shopIds, itemsByShop, total, subtotalForShop, clearCart, removeItem, hydrated } =
    useCart()
  const sandbox = isDevSandboxClient()
  const pendingOnlineMode = useRef<OnlinePayMode>('card')
  const pendingUpiApp = useRef<'gpay' | 'phonepe' | 'paytm' | null>(null)

  const setFulfillmentStore = useCartStore((s) => s.setFulfillmentStore)
  const confirmFulfillmentStoreFn = useCartStore((s) => s.confirmFulfillmentStore)
  const selectedFulfillmentStoreId = useCartStore((s) => s.selectedFulfillmentStoreId)

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
  const [portalReady, setPortalReady] = useState(false)
  const [orderPlacedId, setOrderPlacedId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [paymentEnabled, setPaymentEnabled] = useState<boolean | null>(null)
  const [codEnabled, setCodEnabled] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [runtimeRazorpayKey, setRuntimeRazorpayKey] = useState('')
  const [showPaymentSheet, setShowPaymentSheet] = useState(false)
  const [billPulse, setBillPulse] = useState(0)

  // ── Fulfillment check state ──────────────────────────────────────────────
  const [fulfillmentStores, setFulfillmentStores] = useState<FulfillmentStore[]>([])
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false)
  const [fulfillmentChecking, setFulfillmentChecking] = useState(false)
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null)
  const [networkOffline, setNetworkOffline] = useState(false)
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [showCouponPanel, setShowCouponPanel] = useState(false)
  const [savingsExpanded, setSavingsExpanded] = useState(false)

  const itemTotal = total()
  const partnerTip = selectedTip ?? 0
  const grandTotal = Math.max(0, itemTotal - discountAmount) + deliveryFee + partnerTip

  const deliverySavings = Math.max(0, DEFAULT_DELIVERY_FEE - deliveryFee)
  const feeSavings = LIST_HANDLING_FEE + LIST_LATE_NIGHT_FEE
  const totalSavings = discountAmount + deliverySavings + feeSavings
  const deliveryIsFree = deliveryFee === 0 || deliveryFee < DEFAULT_DELIVERY_FEE

  const deliveryAddress = selectedAddress ? formatCustomerAddress(selectedAddress) : ''
  const lat = selectedAddress?.latitude ?? 19.1364
  const lng = selectedAddress?.longitude ?? 72.8296
  const shopBackHref = shopIds.length === 1 ? `/shops/${shopIds[0]}` : '/cart'
  const cartHasEssentials = shopIds.some(isEssentialsStoreId)

  useEffect(() => {
    if (!hasDeliveryAddress && !selectedAddress) {
      setShowAddressPicker(true)
    }
  }, [hasDeliveryAddress, selectedAddress])

  // Trust httpOnly cookie session — localStorage alone is not enough for payment APIs.
  useEffect(() => {
    if (!authHydrated) return

    let cancelled = false
    void fetchCurrentAuth().then((current) => {
      if (cancelled) return
      if (current) {
        login(current.token, current.user)
        setNeedsAuth(false)
        return
      }
      setNeedsAuth(!(isLoggedIn || Boolean(getClientSession())))
    })

    return () => {
      cancelled = true
    }
  }, [authHydrated, isLoggedIn, login])

  useEffect(() => {
    if (!authHydrated || needsAuth) {
      setPortalReady(!needsAuth)
      return
    }

    let cancelled = false
    void fetch(resolveAppApiUrl('/api/auth/customer-portal'), {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.success && json.data?.token && json.data?.user) {
          login(json.data.token, json.data.user)
        }
        setPortalReady(true)
      })
      .catch(() => {
        if (!cancelled) setPortalReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [authHydrated, needsAuth, login])

  useEffect(() => {
    if (authHydrated && needsAuth && !sandbox) {
      router.push('/auth?role=customer&redirect=/checkout')
    }
  }, [authHydrated, needsAuth, sandbox, router])

  useEffect(() => {
    let cancelled = false
    void fetch(resolveAppApiUrl('/api/payments/config'), { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json.success) return
        const online = Boolean(json.data?.enabled)
        const cod = json.data?.codEnabled !== false
        setPaymentEnabled(online)
        setCodEnabled(cod)
        setPaymentMethod(online ? 'online' : 'cod')
        setRuntimeRazorpayKey(String(json.data?.key ?? ''))
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentEnabled(false)
          setCodEnabled(true)
          setPaymentMethod('cod')
        }
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
          if (!json.success || cancelled) continue

          const products = json.data as Array<{ id: string; isAvailable: boolean }>
          if (!Array.isArray(products) || products.length === 0) continue

          const validIds = new Set(
            products.filter((p) => p.isAvailable).map((p) => p.id),
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

  // ── Network status listener ───────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => setNetworkOffline(false)
    const onOffline = () => setNetworkOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  /**
   * Run the backend fulfillment check.
   * Returns true if we can proceed directly to payment (no split detected),
   * or false if the fulfillment modal should gate the payment.
   */
  const runFulfillmentCheck = useCallback(async (): Promise<boolean> => {
    if (items.length === 0 || !selectedAddress) return false

    setFulfillmentChecking(true)
    setFulfillmentError(null)

    try {
      const payload = {
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        lat: selectedAddress.latitude ?? lat,
        lng: selectedAddress.longitude ?? lng,
        radiusKm: 25,
      }

      const res = await fetch(resolveAppApiUrl('/api/stores/fulfillment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
        const wideRes = await fetch(resolveAppApiUrl('/api/stores/fulfillment'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, radiusKm: 80 }),
        })
        const wideJson = await wideRes.json()
        if (wideJson.success && Array.isArray(wideJson.data) && wideJson.data.length > 0) {
          const store = wideJson.data[0] as FulfillmentStore
          setFulfillmentStore(store.storeId)
          confirmFulfillmentStoreFn()
          return true
        }

        try {
          const shopsRes = await fetch('/api/shops?storeType=KIRANA')
          const shopsJson = await shopsRes.json()
          const fallbackId = shopsJson.data?.[0]?.id as string | undefined
          if (fallbackId) {
            setFulfillmentStore(fallbackId)
            confirmFulfillmentStoreFn()
            return true
          }
        } catch {
          // Server auto-resolves fulfillment on checkout if needed
        }
        return true
      }

      const stores: FulfillmentStore[] = json.data

      const nearestStore = stores[0]!
      const hasFullStore = stores.some((s: FulfillmentStore) => s.fulfillmentType === 'FULL')
      const nearestIsFull = nearestStore.fulfillmentType === 'FULL'

      // Auto-select if only one store or nearest already fulfils 100%
      if (stores.length === 1 || nearestIsFull) {
        setFulfillmentStore(nearestStore.storeId)
        confirmFulfillmentStoreFn()
        return true
      }

      // Inventory split: nearest = partial, further store = full
      // → show fulfillment modal so customer can choose
      if (!nearestIsFull && hasFullStore) {
        setFulfillmentStores(stores.slice(0, 4)) // show up to 4 options
        setShowFulfillmentModal(true)
        return false
      }

      // Default: auto-select nearest
      setFulfillmentStore(nearestStore.storeId)
      confirmFulfillmentStoreFn()
      return true
    } catch {
      // Network failure — proceed without fulfillment binding
      setFulfillmentError(null)
      return true
    } finally {
      setFulfillmentChecking(false)
    }
  }, [items, selectedAddress, lat, lng, setFulfillmentStore, confirmFulfillmentStoreFn])

  const handleFulfillmentConfirm = (storeId: string, _storeName: string) => {
    setFulfillmentStore(storeId)
    confirmFulfillmentStoreFn()
    setShowFulfillmentModal(false)
    setShowPaymentSheet(true)
  }

  const ensureFulfillmentForCheckout = useCallback(async (): Promise<boolean> => {
    if (!cartHasEssentials) return true
    if (selectedFulfillmentStoreId) return true
    return runFulfillmentCheck()
  }, [cartHasEssentials, selectedFulfillmentStoreId, runFulfillmentCheck])

  const buildCheckoutPayload = useCallback(() => {
    const fulfillmentStoreId = useCartStore.getState().selectedFulfillmentStoreId
    return {
      riderTip: partnerTip,
      address: deliveryAddress,
      instruction: instructionLabel(selectedInstruction),
      destLatitude: lat,
      destLongitude: lng,
      couponCode: appliedCoupon ?? undefined,
      ...(fulfillmentStoreId ? { fulfillmentStoreId } : {}),
      shops: shopIds.map((shopId) => ({
        shopId,
        items: (itemsByShop[shopId] ?? []).map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
      })),
    }
  }, [
    partnerTip,
    deliveryAddress,
    selectedInstruction,
    lat,
    lng,
    appliedCoupon,
    shopIds,
    itemsByShop,
  ])

  const ensureCustomerSession = useCallback(async (): Promise<boolean> => {
    return ensureCustomerCheckoutSession(login)
  }, [login])

  const redirectToCheckoutLogin = useCallback(() => {
    router.push('/auth?role=customer&redirect=/checkout')
  }, [router])

  const handlePlaceOrder = async () => {
    if (cartHasEssentials && !useCartStore.getState().selectedFulfillmentStoreId) {
      const ready = await ensureFulfillmentForCheckout()
      if (!ready) return
    }

    if (paymentMethod === 'cod') {
      await handlePlaceCodOrder()
      return
    }
    await runOnlinePayment(pendingOnlineMode.current, pendingUpiApp.current)
  }

  const runOnlinePayment = async (
    mode: OnlinePayMode = 'card',
    upiApp: 'gpay' | 'phonepe' | 'paytm' | null = null,
    allowAuthRetry = true,
  ) => {
    if (items.length === 0 || shopIds.length === 0) return
    if (!selectedAddress || !deliveryAddress.trim()) {
      setError('Please add and select a delivery address.')
      return
    }
    if (!paymentEnabled) {
      setError('Online payment is temporarily unavailable. Try cash on delivery instead.')
      return
    }

    setIsPlacing(true)
    setError(null)

    const authed = await ensureCustomerSession()
    if (!authed) {
      setIsPlacing(false)
      if (sandbox) {
        setNeedsAuth(true)
        return
      }
      redirectToCheckoutLogin()
      return
    }

    const payload = { ...buildCheckoutPayload(), address: deliveryAddress.trim() }
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
        if (intentRes.status === 401 || intentRes.status === 403) {
          if (allowAuthRetry) {
            const retried = await ensureCustomerSession()
            if (retried) {
              setIsPlacing(false)
              await runOnlinePayment(mode, upiApp, false)
              return
            }
          }
          setError(intentJson.error ?? 'Please log in again.')
          if (sandbox) {
            setNeedsAuth(true)
            return
          }
          redirectToCheckoutLogin()
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

      if (mode === 'upi' && upiApp && typeof window !== 'undefined') {
        const vpa = getMerchantUpiVpa()
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        if (vpa && isMobile) {
          const deepLink = buildUpiPayUrl({
            vpa,
            payeeName: 'Rabbit',
            amount: grandTotal,
            transactionNote: `Rabbit ${paymentData.intentId.slice(0, 8)}`,
            app: upiApp,
          })
          window.location.href = deepLink
        }
      }

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
          description:
            mode === 'upi'
              ? 'UPI payment'
              : mode === 'netbanking'
                ? 'Netbanking payment'
                : mode === 'bnpl'
                  ? 'Pay later'
                  : 'Order payment',
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
      setShowPaymentSheet(false)
    }
  }

  const handlePlaceCodOrder = async (allowAuthRetry = true) => {
    if (items.length === 0 || shopIds.length === 0) return
    if (!selectedAddress || !deliveryAddress.trim()) {
      setError('Please add and select a delivery address.')
      return
    }
    if (!codEnabled) {
      setError('Cash on delivery is not available right now.')
      return
    }

    setIsPlacing(true)
    setError(null)

    const authed = await ensureCustomerSession()
    if (!authed) {
      setIsPlacing(false)
      if (sandbox) {
        setNeedsAuth(true)
        return
      }
      redirectToCheckoutLogin()
      return
    }

    const payload = { ...buildCheckoutPayload(), address: deliveryAddress.trim() }

    try {
      const res = await authFetch(
        resolveAppApiUrl('/api/checkout/cod'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        { skipLogoutRedirect: true },
      )

      const json = await res.json()
      if (!json.success) {
        if (res.status === 401 || res.status === 403) {
          if (allowAuthRetry) {
            const retried = await ensureCustomerSession()
            if (retried) {
              setIsPlacing(false)
              await handlePlaceCodOrder(false)
              return
            }
          }
          setError(json.error ?? 'Please log in again.')
          if (sandbox) {
            setNeedsAuth(true)
            return
          }
          redirectToCheckoutLogin()
          return
        }
        setError(json.error ?? 'Could not place order. Please try again.')
        return
      }

      finishOrder(json.data.orderId as string, json.data.orderNumber as string | undefined)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsPlacing(false)
      setShowConfirmLocation(false)
      setShowPaymentSheet(false)
    }
  }

  const requestPlaceOrder = async () => {
    if (!selectedAddress || !deliveryAddress.trim()) {
      setError('Please add and select a delivery address.')
      return
    }
    if (!codEnabled && paymentEnabled !== true) {
      setError('No payment methods are available right now.')
      return
    }
    if (networkOffline) {
      setError('You appear to be offline. Please check your connection and try again.')
      return
    }
    setError(null)

    const authed = await ensureCustomerSession()
    if (!authed) {
      if (sandbox) {
        setNeedsAuth(true)
        return
      }
      redirectToCheckoutLogin()
      return
    }

    const canProceed = await runFulfillmentCheck()
    if (!canProceed) return

    setShowPaymentSheet(true)
  }

  const beginOnlineCheckout = (
    mode: OnlinePayMode,
    upiApp: 'gpay' | 'phonepe' | 'paytm' | null = null,
  ) => {
    setPaymentMethod('online')
    pendingOnlineMode.current = mode
    pendingUpiApp.current = upiApp
    setShowPaymentSheet(false)
    setShowConfirmLocation(true)
  }

  const beginCodCheckout = () => {
    setPaymentMethod('cod')
    setShowPaymentSheet(false)
    setShowConfirmLocation(true)
  }

  const paymentConfirmLabel =
    paymentMethod === 'cod' ? 'Pay on delivery' : 'Pay now'
  const canPlaceOrder = items.length > 0 && hasDeliveryAddress
  const isUnserviceable = !canPlaceOrder || networkOffline
  const bumpBill = useCallback(() => setBillPulse((n) => n + 1), [])

  if (!hydrated || !authHydrated || (!needsAuth && !portalReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] text-sm font-bold text-slate-400">
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
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] text-sm font-bold text-slate-400">
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-4 font-sans">
        <ShoppingBag className="h-12 w-12 text-slate-300" />
        <p className="mt-4 text-slate-600">Your cart is empty</p>
        <Link href="/cart" className="mt-4 font-semibold text-[#FF6B35]">
          Back to cart
        </Link>
      </div>
    )
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-xl bg-[#F3F4F6] pb-36 font-sans">
      {/* ── Sticky address header ── */}
      <div className="sticky top-0 z-50 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
          <Link
            href={shopBackHref}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-700"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setShowAddressPicker((v) => !v)}
            className="flex min-w-0 flex-1 items-start gap-1.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-slate-900">
                  {selectedAddress ? addressLabelDisplay(selectedAddress) : 'Add address'}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-500 transition ${showAddressPicker ? 'rotate-180' : ''}`}
                />
              </div>
              <p className="truncate text-xs text-slate-500">
                {selectedAddress
                  ? formatAddressShort(selectedAddress)
                  : 'Select delivery location to continue'}
              </p>
            </div>
          </button>
        </div>

        {totalSavings > 0 && (
          <button
            type="button"
            onClick={() => setSavingsExpanded((v) => !v)}
            className="flex w-full items-center justify-center gap-1 bg-[#E8F5E9] px-3 py-2 text-xs font-semibold text-[#2E7D32]"
          >
            <span>Yay! You saved ₹{totalSavings} on this order</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition ${savingsExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
        {savingsExpanded && totalSavings > 0 && (
          <div className="border-b border-[#C8E6C9] bg-[#E8F5E9]/80 px-4 py-2 text-[11px] text-[#2E7D32]">
            {discountAmount > 0 && <p>Coupon savings · ₹{discountAmount}</p>}
            {deliverySavings > 0 && <p>Delivery savings · ₹{deliverySavings}</p>}
            {feeSavings > 0 && <p>Fee waivers · ₹{feeSavings}</p>}
          </div>
        )}
      </div>

      <div className="space-y-3 px-3 py-3">
        {/* Address picker (loads in background, shown on tap) */}
        <div className={showAddressPicker ? 'block' : 'hidden'}>
          <CheckoutAddressSection
            selectedId={selectedAddress?.id ?? null}
            onSelect={(addr) => {
              setSelectedAddress(addr)
              setShowAddressPicker(false)
            }}
            onAddressResolved={setHasDeliveryAddress}
          />
        </div>

        {/* Coupons & offers */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setShowCouponPanel((v) => !v)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <Ticket className="h-4 w-4 text-emerald-600" />
            </span>
            <span className="flex-1 text-sm font-semibold text-slate-800">View coupons</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
          {showCouponPanel && (
            <div className="border-t border-dashed border-gray-200 px-4 pb-4 pt-3">
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold uppercase focus:border-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleApplyCoupon()}
                  disabled={applyingCoupon || !couponCode.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  {applyingCoupon ? '…' : 'Apply'}
                </button>
              </div>
              {couponError && (
                <p className="mt-2 text-xs font-medium text-red-600">{couponError}</p>
              )}
              {appliedCoupon && discountAmount > 0 && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  {appliedCoupon} applied — ₹{discountAmount} off
                </p>
              )}
            </div>
          )}
          <div className="border-t border-dashed border-gray-200" />
          <button
            type="button"
            onClick={() => {
              if (!selectedAddress) {
                setError('Please add and select a delivery address first.')
                setShowAddressPicker(true)
                return
              }
              void (async () => {
                const authed = await ensureCustomerSession()
                if (!authed) {
                  if (sandbox) setNeedsAuth(true)
                  else redirectToCheckoutLogin()
                  return
                }
                const canProceed = await ensureFulfillmentForCheckout()
                if (!canProceed) return
                setShowPaymentSheet(true)
              })()
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </span>
            <span className="flex-1 text-sm font-semibold text-slate-800">View payment offers</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Basket */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Your Basket</h3>
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const lineTotal = item.price * item.quantity
              const estMrp = Math.round(lineTotal * 1.12)
              const showStrike = estMrp > lineTotal
              return (
                <div key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400">Qty {item.quantity}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {showStrike && (
                      <span className="mr-1.5 text-sm text-gray-400 line-through">₹{estMrp}</span>
                    )}
                    <span className="text-sm font-bold text-slate-900">₹{lineTotal}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tip */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Smile className="h-4 w-4 text-[#FF6B35]" />
            <h3 className="text-sm font-bold text-slate-900">Tip your delivery partner</h3>
          </div>
          <div className="flex gap-2">
            {TIP_OPTIONS.map((tip) => (
              <button
                key={tip}
                type="button"
                onClick={() => setSelectedTip(selectedTip === tip ? null : tip)}
                className={`flex-1 rounded-xl border py-2 text-xs font-bold transition ${
                  selectedTip === tip
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-gray-200 bg-white text-slate-700'
                }`}
              >
                ₹{tip}
              </button>
            ))}
          </div>
        </div>

        {/* Delivery instructions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Delivery instructions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedInstruction(selectedInstruction === 'gate' ? null : 'gate')}
              className={`flex h-16 flex-col justify-between rounded-xl border p-2.5 text-left ${
                selectedInstruction === 'gate'
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <Milestone className="h-4 w-4 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-700">Leave at Gate</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedInstruction(selectedInstruction === 'bell' ? null : 'bell')}
              className={`flex h-16 flex-col justify-between rounded-xl border p-2.5 text-left ${
                selectedInstruction === 'bell'
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <BellOff className="h-4 w-4 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-700">Don&apos;t Ring Bell</span>
            </button>
          </div>
        </div>

        <CompleteYourBasket shopIds={shopIds} onTotalBump={bumpBill} />

        {/* Bill summary */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Bill Summary</h3>
          <div className="space-y-2.5 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Item Total</span>
              <motion.span
                key={`items-${itemTotal}-${billPulse}`}
                initial={{ scale: 1.06 }}
                animate={{ scale: 1 }}
                transition={billSpring}
                className="font-bold text-slate-900"
              >
                ₹{itemTotal}
              </motion.span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Coupon discount
                </span>
                <span className="font-bold">-₹{discountAmount}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Delivery Fee</span>
              {deliveryIsFree ? (
                <div>
                  <span className="mr-2 text-sm text-gray-400 line-through">
                    ₹{DEFAULT_DELIVERY_FEE}
                  </span>
                  <span className="font-bold text-emerald-600">FREE</span>
                </div>
              ) : multiShopRoutingFee > 0 ? (
                <span className="font-bold text-slate-900">₹{deliveryFee - multiShopRoutingFee}</span>
              ) : (
                <span className="font-bold text-slate-900">₹{deliveryFee}</span>
              )}
            </div>
            {multiShopRoutingFee > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Multi-store routing</span>
                <span className="font-bold text-slate-900">₹{multiShopRoutingFee}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Handling Fee</span>
              <div>
                <span className="mr-2 text-sm text-gray-400 line-through">₹{LIST_HANDLING_FEE}</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Late Night Fee</span>
              <div>
                <span className="mr-2 text-sm text-gray-400 line-through">₹{LIST_LATE_NIGHT_FEE}</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>
            </div>
            {partnerTip > 0 && (
              <div className="flex justify-between">
                <span>Delivery partner tip</span>
                <span className="font-bold text-slate-900">₹{partnerTip}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5 text-[11px] font-medium text-emerald-800">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Sealed packs · contactless dispatch · secure checkout</span>
        </div>

        {error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {/* ── Fixed footer ── */}
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <AdBanner placement="CHECKOUT_PAGE" className="mb-2.5 h-16 w-full rounded-xl" />
        <div className="flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To Pay</p>
            <motion.p
              key={`footer-${grandTotal}-${billPulse}`}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={billSpring}
              className="text-lg font-black tabular-nums text-slate-900"
            >
              ₹{grandTotal}
            </motion.p>
          </div>
          <button
            type="button"
            onClick={() => void requestPlaceOrder()}
            disabled={isPlacing || fulfillmentChecking || isUnserviceable}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-3.5 text-sm font-bold transition ${
              isUnserviceable
                ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                : 'bg-slate-900 text-white active:scale-[0.98]'
            } disabled:opacity-70`}
          >
            {isPlacing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : fulfillmentChecking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking stores…
              </>
            ) : isUnserviceable ? (
              'Cart is unserviceable'
            ) : (
              <>
                Continue to Pay
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <PaymentSheetDrawer
        open={showPaymentSheet}
        onClose={() => !isPlacing && setShowPaymentSheet(false)}
        grandTotal={grandTotal}
        codEnabled={codEnabled}
        onlineEnabled={paymentEnabled === true}
        isPlacing={isPlacing}
        onPayCod={beginCodCheckout}
        onPayUpiApp={(app) => beginOnlineCheckout('upi', app)}
        onPayCard={() => beginOnlineCheckout('card')}
        onPayNetbanking={() => beginOnlineCheckout('netbanking')}
        onPayBnpl={() => beginOnlineCheckout('bnpl')}
      />

      <ConfirmDeliveryLocationModal
        open={showConfirmLocation}
        address={selectedAddress}
        grandTotal={grandTotal}
        paymentLabel={paymentConfirmLabel}
        isCod={paymentMethod === 'cod'}
        isPlacing={isPlacing}
        onConfirm={() => void handlePlaceOrder()}
        onChangeAddress={() => setShowConfirmLocation(false)}
        onClose={() => !isPlacing && setShowConfirmLocation(false)}
      />

      {/* Multi-store fulfillment modal — appears above the payment sheet */}
      <StoreFulfillmentModal
        open={showFulfillmentModal}
        stores={fulfillmentStores}
        totalItems={items.reduce((sum, i) => sum + i.quantity, 0)}
        onConfirm={handleFulfillmentConfirm}
        onClose={() => setShowFulfillmentModal(false)}
      />

      {/* Offline banner */}
      {networkOffline && (
        <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">
          <WifiOff className="h-3.5 w-3.5" />
          No internet connection — please reconnect before placing your order
        </div>
      )}
    </div>
  )
}
