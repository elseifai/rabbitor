'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, WifiOff } from 'lucide-react'
import {
  UnifiedProductCard,
  type UnifiedProductData,
} from '@/components/products/UnifiedProductCard'
import {
  ESSENTIALS_STORE_ID,
  ESSENTIALS_STORE_NAME,
  dedupeEssentialsCatalogProducts,
  type EssentialsCatalogProduct,
} from '@/lib/essentials-catalog'
import { essentialsCategoryLabel } from '@/lib/category-routing'
import { PLATFORM_META } from '@/lib/platform-categories'

function toUnifiedProduct(item: EssentialsCatalogProduct): UnifiedProductData {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    mrp: item.mrp,
    unit: item.unit,
    image: item.image,
    storeId: ESSENTIALS_STORE_ID,
    storeName: ESSENTIALS_STORE_NAME,
    storeType: item.storeType,
    stock: item.inStock ? 99 : 0,
  }
}

export function EssentialsCatalogView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = searchParams.get('category') ?? 'kirana'

  const [products, setProducts] = useState<EssentialsCatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => essentialsCategoryLabel(category), [category])
  const meta = PLATFORM_META.ESSENTIALS

  const uniqueProducts = useMemo(
    () => dedupeEssentialsCatalogProducts(products),
    [products],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ limit: '100', category })

    fetch(`/api/catalog/essentials?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (!json.success) {
          setProducts([])
          setError(json.error ?? 'Could not load catalog')
          return
        }
        setProducts(json.data ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([])
          setError('Network error — check your connection and try again.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [category])

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#F0F0F0] pb-24 font-sans">
      <header className="sticky top-0 z-40 border-b border-[#F0F0F0] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F8F8] text-[#1C1C1C]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-[#1C1C1C]">{title}</h1>
            <p className="text-[11px] font-semibold text-[#0C831F]">
              {meta.badge} · {meta.subtitle}
            </p>
          </div>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
            <p className="mt-3 text-sm font-medium text-[#878787]">Loading global catalog…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-10 text-center">
            <WifiOff className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 text-sm font-bold text-[#FF6B35]"
            >
              Retry
            </button>
          </div>
        ) : uniqueProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E0E0E0] bg-white py-16 text-center">
            <p className="text-sm font-semibold text-[#878787]">No products in this category yet.</p>
            <Link href="/" className="mt-3 inline-block text-sm font-bold text-[#FF6B35]">
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-[#878787]">
              {uniqueProducts.length} item{uniqueProducts.length !== 1 ? 's' : ''} · Delivered from
              nearest dark store
            </p>
            <div className="grid grid-cols-2 gap-2">
              {uniqueProducts.map((product) => (
                <UnifiedProductCard
                  key={product.id}
                  product={toUnifiedProduct(product)}
                  variant="GROCERY"
                  eagerImage={false}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
