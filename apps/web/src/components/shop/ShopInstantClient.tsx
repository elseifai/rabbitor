'use client'

import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Star, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store'
import type { CatalogShop } from '@/lib/shop-catalog'

export function ShopInstantClient({ shop }: { shop: CatalogShop }) {
  const cartItems = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const itemCount = cartItems.reduce((n, i) => n + i.quantity, 0)

  const getQty = (productId: string) =>
    cartItems.find((i) => i.productId === productId)?.quantity ?? 0

  const updateQty = (product: CatalogShop['products'][0], delta: number) => {
    const current = getQty(product.id)
    const next = current + delta

    if (next <= 0) {
      updateQuantity(product.id, 0)
      return
    }

    if (current === 0) {
      addItem({
        productId: product.id,
        shopId: shop.id,
        shopName: shop.name,
        shopSlug: shop.slug,
        name: product.name,
        price: product.price,
        unit: product.unit,
      })
      if (next > 1) updateQuantity(product.id, next)
      return
    }

    updateQuantity(product.id, next)
  }

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-4">
        <Link href="/" className="text-gray-700 hover:text-orange-600">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h2 className="max-w-[70%] truncate text-sm font-bold text-gray-800">{shop.name}</h2>
        <div className="w-6" />
      </div>

      <div className="border-b bg-gradient-to-b from-gray-50 to-white p-4">
        <h1 className="text-xl font-extrabold text-gray-900">{shop.name}</h1>
        <div className="mt-2 flex items-center gap-3 text-xs font-bold text-gray-600">
          <span className="flex items-center gap-0.5 rounded-md bg-green-50 px-2 py-0.5 text-green-700">
            <Star className="h-3 w-3 fill-current" /> 4.6
          </span>
          <span>•</span>
          <span className="text-orange-600">Hyperlocal Delivery (10-15 mins)</span>
        </div>
      </div>

      <div className="mx-auto max-w-xl divide-y px-4">
        {shop.products.map((item) => {
          const qty = getQty(item.id)
          return (
            <div key={item.id} className="flex items-center justify-between gap-4 py-4">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-800">{item.name}</h3>
                <p className="mt-0.5 text-xs font-medium text-gray-400">{item.unit}</p>
                <p className="mt-2 text-sm font-extrabold text-gray-900">₹{item.price}</p>
              </div>

              {qty === 0 ? (
                <button
                  type="button"
                  onClick={() => updateQty(item, 1)}
                  className="rounded-xl border border-orange-200 bg-orange-50/50 px-6 py-1.5 text-xs font-bold uppercase text-orange-600 shadow-sm transition hover:bg-orange-600 hover:text-white"
                >
                  Add
                </button>
              ) : (
                <div className="flex items-center overflow-hidden rounded-xl border border-orange-500 bg-orange-600 text-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => updateQty(item, -1)}
                    className="px-3 py-1.5 text-xs font-bold hover:bg-orange-700"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="px-2 text-xs font-bold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item, 1)}
                    className="px-3 py-1.5 text-xs font-bold hover:bg-orange-700"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-20 mx-auto flex max-w-md animate-slide-up items-center justify-between rounded-2xl bg-orange-600 px-4 py-3.5 text-white shadow-xl">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <div>
              <p className="text-xs font-bold text-orange-100">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} selected
              </p>
              <p className="text-sm font-black">From Nearby Market</p>
            </div>
          </div>
          <Link
            href="/checkout"
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            View Basket →
          </Link>
        </div>
      )}
    </div>
  )
}
