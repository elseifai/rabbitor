'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { AdBanner } from '@/components/ads/AdBanner'
import { CartMilestoneTracker } from '@/components/cart/CartMilestoneTracker'

const PLATFORM_FEE = 5

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const itemTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const deliveryFee = 20
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const grandTotal = Math.max(0, itemTotal - discount) + deliveryFee + PLATFORM_FEE

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setApplying(true)
    setCouponError(null)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), cartTotal: itemTotal }),
      })
      const json = await res.json()
      if (!json.success) {
        setDiscount(0)
        setCouponError(json.error ?? 'Invalid coupon')
        return
      }
      setDiscount(json.data.discountAmount as number)
    } catch {
      setCouponError('Could not validate coupon')
    } finally {
      setApplying(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[480px] flex-col items-center px-4 py-20 text-center">
        <div className="text-6xl">🛒</div>
        <h1 className="mt-4 text-xl font-bold text-[#1C1C1C]">Your cart is empty</h1>
        <p className="mt-1 text-sm text-[#878787]">Add items from nearby stores</p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-[#FF6B35] px-6 py-3 text-sm font-bold text-white"
        >
          Browse Shops
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[480px] px-4 py-4 pb-44">
      <h1 className="text-lg font-bold text-[#1C1C1C]">Your Cart</h1>
      <p className="text-sm text-[#FF6B35]">{items[0]?.storeName}</p>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex gap-3 rounded-xl border border-[#F0F0F0] bg-white p-3"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F8F8F8]">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl">🛒</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#1C1C1C]">{item.name}</p>
              <p className="text-xs text-[#878787]">{item.storeName}</p>
              <p className="mt-1 text-sm font-bold text-[#0C831F]">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#0C831F]"
              >
                <Minus className="h-3.5 w-3.5 text-[#0C831F]" />
              </button>
              <span className="text-sm font-bold">{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0C831F] text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl border border-[#F0F0F0] bg-white p-4">
        <h2 className="text-sm font-bold text-[#1C1C1C]">Bill Details</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#878787]">Item total</span>
            <span className="font-semibold">{formatCurrency(itemTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#878787]">Delivery fee</span>
            <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#878787]">Platform fee</span>
            <span className="font-semibold">{formatCurrency(PLATFORM_FEE)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-[#0C831F]">
              <span>Coupon discount</span>
              <span className="font-semibold">−{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#F0F0F0] pt-2 font-bold">
            <span>Grand Total</span>
            <span className="text-[#0C831F]">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      <AdBanner placement="CART_PAGE" className="mt-4 h-24 w-full" />

      <div className="mt-4 flex gap-2">
        <input
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Coupon code"
          className="flex-1 rounded-xl border border-[#F0F0F0] px-3 py-2.5 text-sm uppercase"
        />
        <button
          type="button"
          onClick={() => void handleApplyCoupon()}
          disabled={applying}
          className="rounded-xl bg-[#1C1C1C] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Apply
        </button>
      </div>
      {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}

      <CartMilestoneTracker stackAboveCheckout />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#F0F0F0] bg-white px-4 py-3">
        <div className="mx-auto max-w-[480px]">
          <Link
            href="/checkout"
            className="block w-full rounded-xl bg-[#FF6B35] py-3.5 text-center text-sm font-bold text-white shadow-lg"
          >
            Proceed to Checkout · {formatCurrency(grandTotal)}
          </Link>
        </div>
      </div>
    </div>
  )
}
