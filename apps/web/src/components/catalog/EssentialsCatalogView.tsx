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
import { normalizeCatalogSegmentSlug } from '@/lib/essentials-catalog-segments'
import {
  filterProductsByNavItem,
  getSegmentNavItems,
  navItemsWithCounts,
  type SegmentNavItem,
  type SegmentNavItemWithCount,
} from '@/lib/essentials-segment-nav'
import { resolveImageSrc } from '@/lib/image-url'
import { cn } from '@/lib/utils'

function SegmentNavThumb({
  item,
  isActive,
}: {
  item: SegmentNavItemWithCount
  isActive: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = resolveImageSrc(item.thumbSrc, '')
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        isActive ? 'border-[#DDD6FE]' : 'border-[#E8E8E8]',
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xl leading-none" aria-hidden>
          🛒
        </span>
      )}
    </div>
  )
}

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
  const segment = normalizeCatalogSegmentSlug(category) ?? 'kirana'

  const [products, setProducts] = useState<EssentialsCatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeNavId, setActiveNavId] = useState('all')

  const title = useMemo(() => essentialsCategoryLabel(category), [category])
  const meta = PLATFORM_META.ESSENTIALS

  const uniqueProducts = useMemo(
    () => dedupeEssentialsCatalogProducts(products),
    [products],
  )

  const navItems = useMemo(() => getSegmentNavItems(segment), [segment])

  const visibleNavItems = useMemo(
    () => navItemsWithCounts(uniqueProducts, navItems),
    [uniqueProducts, navItems],
  )

  const activeNav = useMemo((): SegmentNavItem => {
    return visibleNavItems.find((n) => n.id === activeNavId) ?? visibleNavItems[0] ?? navItems[0]
  }, [visibleNavItems, activeNavId, navItems])

  const filteredProducts = useMemo(
    () => filterProductsByNavItem(uniqueProducts, activeNav),
    [uniqueProducts, activeNav],
  )

  useEffect(() => {
    setActiveNavId('all')
  }, [category])

  useEffect(() => {
    if (!visibleNavItems.some((n) => n.id === activeNavId)) {
      setActiveNavId(visibleNavItems[0]?.id ?? 'all')
    }
  }, [visibleNavItems, activeNavId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ limit: '500', category })

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
    <div className="mx-auto flex h-[100dvh] max-w-[480px] flex-col bg-white font-sans">
      <header className="sticky top-0 z-40 shrink-0 border-b border-[#EBEBEB] bg-white px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#1C1C1C]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-bold leading-tight text-[#1C1C1C]">
              {title}
            </h1>
            <p className="truncate text-[10px] font-semibold text-[#0C831F]">
              {meta.badge} · {meta.subtitle}
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Zepto-style left sub-category rail */}
        <nav
          className="w-[88px] shrink-0 overflow-y-auto border-r border-[#EBEBEB] bg-[#F7F7F7] py-1 scrollbar-hide"
          aria-label="Sub-categories"
        >
          {visibleNavItems.map((item) => {
            const isActive = item.id === activeNav.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNavId(item.id)}
                className={cn(
                  'relative flex w-full touch-manipulation select-none flex-col items-center gap-1.5 px-1 py-3 transition-colors',
                  isActive ? 'bg-[#F3EEFF]' : 'hover:bg-white/70 active:bg-white/90',
                )}
              >
                {isActive && (
                  <span
                    className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#7C3AED]"
                    aria-hidden
                  />
                )}
                <SegmentNavThumb item={item} isActive={isActive} />
                <span
                  className={cn(
                    'w-full px-0.5 text-center text-[10px] leading-[1.25] tracking-tight',
                    isActive ? 'font-bold text-[#7C3AED]' : 'font-medium text-[#424242]',
                  )}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Right product grid */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-white pb-24">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-[#0C831F]" />
              <p className="mt-2.5 text-xs font-medium text-[#878787]">Loading…</p>
            </div>
          ) : error ? (
            <div className="m-2 rounded-xl border border-red-100 bg-red-50 px-3 py-8 text-center">
              <WifiOff className="mx-auto h-7 w-7 text-red-400" />
              <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 text-xs font-bold text-[#0C831F]"
              >
                Retry
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="m-2 rounded-xl border border-dashed border-[#E8E8E8] py-12 text-center">
              <p className="text-xs font-semibold text-[#878787]">
                No products in {activeNav.label} yet.
              </p>
              <Link href="/" className="mt-2 inline-block text-xs font-bold text-[#0C831F]">
                Back to home
              </Link>
            </div>
          ) : (
            <div className="px-2 py-2">
              <p className="mb-2 px-0.5 text-[10px] font-medium text-[#9E9E9E]">
                {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}
                {activeNav.id !== 'all' ? ` · ${activeNav.label}` : ''}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
                {filteredProducts.map((product) => (
                  <UnifiedProductCard
                    key={product.id}
                    product={toUnifiedProduct(product)}
                    variant="GROCERY"
                    className="rounded-xl border-[#F0F0F0] p-2 shadow-none"
                    eagerImage={false}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
