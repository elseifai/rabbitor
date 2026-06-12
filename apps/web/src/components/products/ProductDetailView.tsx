'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, Loader2 } from 'lucide-react'
import { useCartStore } from '@/store'
import { ProductImage } from '@/components/products/ProductImage'
import { formatCurrency } from '@/lib/utils'
import {
  UnifiedProductCard,
  type UnifiedProductData,
} from '@/components/products/UnifiedProductCard'

export type ProductDetail = {
  id: string
  name: string
  description: string | null
  price: number
  mrp: number | null
  unit: string
  image: string | null
  stock: number
  category: string
  isAvailable: boolean
  shopId: string
  shopName: string
  shopSlug: string
  storeType: string
}

function toCardProduct(p: ProductDetail): UnifiedProductData {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    mrp: p.mrp,
    unit: p.unit,
    image: p.image,
    storeId: p.shopId,
    storeName: p.shopName,
    storeType: p.storeType,
    stock: p.stock,
  }
}

function isFashionCategory(category: string, storeType: string) {
  const c = category.toLowerCase()
  return (
    storeType === 'GENERAL' ||
    c.includes('fashion') ||
    c.includes('apparel') ||
    c.includes('footwear')
  )
}

export function ProductDetailView({ productId }: { productId: string }) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [similar, setSimilar] = useState<ProductDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const inCart = useCartStore((s) => s.items.find((i) => i.id === productId))

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/products/${productId}`)
        const json = await res.json()
        if (cancelled) return
        if (!json.success) {
          setError(json.error ?? 'Product not found')
          return
        }
        setProduct(json.data.product as ProductDetail)
        setSimilar(json.data.similar as ProductDetail[])
      } catch {
        if (!cancelled) setError('Could not load product')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [productId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E42575]" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-gray-500">{error ?? 'Product not found'}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-bold text-[#E42575]">
          ← Back to home
        </Link>
      </div>
    )
  }

  const originalPrice = product.mrp && product.mrp > product.price ? product.mrp : null
  const outOfStock = !product.isAvailable || product.stock === 0
  const variant = isFashionCategory(product.category, product.storeType)
    ? 'RETAIL'
    : 'GROCERY'

  const handleAdd = () => {
    addItem({
      id: product.id,
      storeId: product.shopId,
      storeName: product.shopName,
      name: product.name,
      price: product.price,
      image: product.image ?? undefined,
    })
  }

  return (
    <div className="mx-auto max-w-lg pb-28">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <Link
          href={`/shops/${product.shopSlug}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200"
          aria-label="Back to shop"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-gray-500">{product.shopName}</p>
          <h1 className="truncate text-sm font-bold text-gray-900">{product.name}</h1>
        </div>
      </div>

      {/* Product summary */}
      <section className="bg-white px-4 pt-4">
        <ProductImage src={product.image} alt={product.name} className="rounded-2xl" />

        <div className="mt-4">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          <p className="mt-1 text-sm text-gray-400">{product.unit}</p>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-black text-gray-900">
              {formatCurrency(product.price)}
            </span>
            {originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(originalPrice)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{product.description}</p>
          )}

          <div className="mt-6">
            {outOfStock ? (
              <p className="rounded-xl bg-gray-100 py-3.5 text-center text-sm font-bold text-gray-500">
                Out of Stock
              </p>
            ) : inCart ? (
              <div className="flex items-center justify-between rounded-xl border border-pink-200 bg-pink-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">In your cart</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-pink-200 bg-white text-[#E42575]"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[24px] text-center text-base font-bold text-[#E42575]">
                    {inCart.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E42575] text-white"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="w-full rounded-xl bg-[#E42575] py-3.5 text-sm font-bold text-white shadow-md transition active:scale-[0.98]"
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Similar products */}
      {similar.length > 0 && (
        <section className="mt-6 border-t border-gray-100 bg-white px-4 py-5">
          <h3 className="text-base font-bold text-gray-900">Similar Products</h3>
          <p className="mt-0.5 text-xs text-gray-500">More from {product.shopName}</p>
          <div className="-mx-1 mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {similar.map((p) => (
              <div key={p.id} className="w-[148px] shrink-0">
                <UnifiedProductCard
                  product={toCardProduct(p)}
                  variant={variant}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
