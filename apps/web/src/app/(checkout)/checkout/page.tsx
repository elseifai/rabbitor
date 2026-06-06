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
} from 'lucide-react'
import { useLocationStore } from '@/store'
import { getDeliveryQuote } from '@/actions/shops'
import { SAVED_LOCATIONS } from '@/lib/constants'

const TIP_OPTIONS = [20, 30, 50, 70]
const DEFAULT_DELIVERY_FEE = 35

function instructionLabel(key: string | null): string | undefined {
  if (key === 'gate') return 'Leave at Gate'
  if (key === 'bell') return "Don't Ring Bell"
  return undefined
}

export default function DynamicCheckoutPage() {
  const router = useRouter()
  const { cartItems, shopId, getCartTotal, clearCart, hydrated } = useCart()
  const location = useLocationStore((s) => s.location)

  const [selectedTip, setSelectedTip] = useState<number | null>(null)
  const [selectedInstruction, setSelectedInstruction] = useState<string | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(DEFAULT_DELIVERY_FEE)

  const itemTotal = getCartTotal()
  const partnerTip = selectedTip ?? 0
  const grandTotal = itemTotal + deliveryFee + partnerTip

  const addressLine = 'Royal Heights, Apartment 402, Sector 4, Mumbai, MH'
  const lat = location?.latitude ?? SAVED_LOCATIONS[0].latitude
  const lng = location?.longitude ?? SAVED_LOCATIONS[0].longitude
  const shopBackHref = shopId ? `/shops/${shopId}` : '/'

  useEffect(() => {
    if (!shopId || cartItems.length === 0) return
    getDeliveryQuote({ shopId, lat, lng, subtotal: itemTotal })
      .then((q) => setDeliveryFee(q.deliveryFee))
      .catch(() => setDeliveryFee(DEFAULT_DELIVERY_FEE))
  }, [shopId, lat, lng, itemTotal, cartItems.length])

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || !shopId) return
    setIsPlacing(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          itemTotal,
          deliveryFee,
          riderTip: partnerTip,
          grandTotal,
          address: addressLine,
          instruction: instructionLabel(selectedInstruction),
          destLatitude: lat,
          destLongitude: lng,
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      })

      const json = await response.json()
      if (!json.success) {
        if (response.status === 401) {
          router.push('/login?redirect=/checkout')
          return
        }
        setError(json.error ?? 'Order failed. Please try again.')
        return
      }

      clearCart()
      router.push(`/track/${json.orderId}`)
    } catch (err) {
      console.error('Order processing failed:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsPlacing(false)
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm font-bold text-slate-400">
        Loading basket…
      </div>
    )
  }

  if (cartItems.length === 0) {
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
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900">Delivering to Home</h3>
            <p className="text-xs font-semibold leading-relaxed text-slate-500">{addressLine}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-[2rem] border bg-white p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Your Basket
          </h3>
          <div className="divide-y divide-slate-50">
            {cartItems.map((item) => (
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
            Bill Details
          </h3>
          <div className="space-y-2.5 text-xs font-bold text-slate-600">
            <div className="flex justify-between">
              <span>Item Total</span>
              <span className="font-extrabold text-slate-900">₹{itemTotal}</span>
            </div>
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
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl border-t bg-white p-4 shadow-md">
        <button
          type="button"
          onClick={() => void handlePlaceOrder()}
          disabled={isPlacing || cartItems.length === 0}
          className="flex w-full items-center justify-between rounded-2xl bg-[#FF6B35] px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl disabled:bg-slate-300 disabled:shadow-none"
        >
          <span className="text-base font-black">₹{grandTotal}</span>
          <span className="flex items-center gap-1.5">
            {isPlacing ? 'Processing...' : 'Place Order'} <CreditCard className="h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  )
}
