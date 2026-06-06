'use client'

import Link from 'next/link'
import { ShoppingBag, ArrowLeft } from 'lucide-react'
import { useCartStore } from '@/store'
import { formatCurrency } from '@/lib/utils'

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const itemTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Your cart is empty</h1>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Browse shops
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <p className="text-sm text-gray-500">{items[0]?.shopName}</p>
      <h1 className="text-xl font-bold">Cart ({items.length})</h1>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item.productId} className="flex justify-between rounded-xl border p-4">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                className="h-8 w-8 rounded-lg border"
              >
                −
              </button>
              <span>{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                className="h-8 w-8 rounded-lg border"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-between border-t pt-4 font-bold">
        <span>Subtotal</span>
        <span>{formatCurrency(itemTotal)}</span>
      </div>
      <Link
        href="/checkout"
        className="mt-6 block w-full rounded-xl bg-orange-600 py-3 text-center font-semibold text-white"
      >
        Proceed to checkout
      </Link>
    </div>
  )
}
