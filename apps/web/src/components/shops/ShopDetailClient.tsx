'use client'

import Link from 'next/link'
import { ArrowLeft, Plus, Minus, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store'
import { formatCurrency, cn } from '@/lib/utils'

interface ShopData {
  id: string
  name: string
  slug: string
  isActive: boolean
  address: string
  minOrderValue: number
  products: {
    id: string
    name: string
    price: number
    unit: string
    image: string | null
  }[]
}

export function ShopDetailClient({ shop }: { shop: ShopData }) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const cartItems = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total())

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6">
      <Link href="/shops" className="inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Back to shops
      </Link>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            shop.isActive ? 'bg-rabbit-100 text-rabbit-700' : 'bg-gray-100',
          )}
        >
          {shop.isActive ? 'Open now' : 'Closed'}
        </span>
        <h1 className="mt-2 font-display text-2xl font-bold">{shop.name}</h1>
        <p className="text-sm text-gray-500">{shop.address}</p>
        <p className="mt-2 text-sm text-gray-600">
          Min order {formatCurrency(shop.minOrderValue)}
        </p>
      </div>

      <h2 className="mt-8 mb-4 font-semibold">Products</h2>
      <div className="space-y-3">
        {shop.products.map((product) => {
          const inCart = cartItems.find((i) => i.productId === product.id)
          return (
            <div key={product.id} className="flex gap-4 rounded-2xl border bg-white p-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">🛒</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{product.name}</p>
                <p className="text-xs text-gray-500">{product.unit}</p>
                <p className="mt-1 font-semibold text-rabbit-700">
                  {formatCurrency(product.price)}
                </p>
              </div>
              {inCart ? (
                <div className="flex items-center gap-2 self-center">
                  <button type="button" onClick={() => updateQuantity(product.id, inCart.quantity - 1)} className="h-9 w-9 rounded-lg border">−</button>
                  <span>{inCart.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(product.id, inCart.quantity + 1)} className="h-9 w-9 rounded-lg bg-rabbit-600 text-white">+</button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!shop.isActive}
                  onClick={() =>
                    addItem({
                      productId: product.id,
                      shopId: shop.id,
                      shopName: shop.name,
                      shopSlug: shop.slug,
                      name: product.name,
                      price: product.price,
                      unit: product.unit,
                      image: product.image ?? undefined,
                    })
                  }
                  className="self-center rounded-xl bg-rabbit-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Add
                </button>
              )}
            </div>
          )
        })}
      </div>

      {cartItems.length > 0 && (
        <Link href="/cart" className="fixed bottom-4 left-4 right-4 mx-auto flex max-w-lg items-center justify-center gap-2 rounded-2xl bg-rabbit-600 py-4 font-semibold text-white shadow-lg sm:left-1/2 sm:-translate-x-1/2">
          <ShoppingBag className="h-5 w-5" />
          View cart · {formatCurrency(total)}
        </Link>
      )}
    </div>
  )
}
