'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp, Percent } from 'lucide-react'
import { RotatingSearchBar } from '@/components/navigation/RotatingSearchBar'
import { StorefrontProfileButton } from '@/components/layout/StorefrontProfileButton'
import { SubPlatformTabs } from '@/components/navigation/SubPlatformTabs'
import {
  UnifiedProductCard,
  type UnifiedProductData,
} from '@/components/products/UnifiedProductCard'
import {
  SUB_PLATFORM_CONFIG,
  parseSubPlatformId,
  type SubPlatformId,
} from '@/lib/sub-platforms'
import { useLocationStore, useCartStore } from '@/store'
import { SAVED_LOCATIONS } from '@/lib/constants'
import { useHomeFeedConfig } from '@/hooks/useHomeFeedConfig'
import { DEFAULT_COMPONENT_TOGGLES } from '@/lib/home-feed-config'
import { getNearbyShops, type ShopListItem } from '@/actions/shops'
import { useAuth } from '@/context/AuthContext'
import { resolveImageSrc } from '@/lib/image-url'
import { cn, formatCurrency } from '@/lib/utils'
import { AdBanner } from '@/components/ads/AdBanner'
import { RestaurantsHomeSection } from '@/components/home/RestaurantsHomeSection'
import { PromoDealsModal } from '@/components/home/PromoDealsModal'
import { HomeCategoryTile } from '@/components/home/HomeCategoryTile'
import { STORE_TYPE_LINK } from '@/lib/categories'
import {
  ESSENTIALS_STORE_ID,
  ESSENTIALS_STORE_NAME,
  ESSENTIALS_STORE_SLUG,
} from '@/lib/essentials-catalog'
import { ESSENTIALS_STORE_TYPES } from '@/lib/platform-categories'
import { resolveCategoryHref } from '@/lib/category-routing'

type DealProduct = {
  id: string
  name: string
  unit: string
  price: number
  mrp?: number | null
  image: string | null
  shopId: string
  shopName: string
  shopSlug: string
  storeType?: string
  stock?: number
  shopRating?: number
}

const HOME_FILTER_CHIPS = [
  { id: 'all', label: 'All', emoji: '🏠' },
  { id: 'veggies', label: 'Fresh', emoji: '🥬' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛' },
  { id: 'kirana', label: 'Fruits', emoji: '🍎' },
  { id: 'bakery', label: 'Bakery', emoji: '🥖' },
  { id: 'pharmacy', label: 'Pharmacy', emoji: '💊' },
] as const

const TOP_RATED_MIN = 4
const TOP_SHOP_LIMIT = 5
const HOME_DEALS_CACHE_KEY = 'rabbit_home_deals_v2'

function isMarketplaceSubPlatform(sub: SubPlatformId): boolean {
  return sub === 'fashion' || sub === 'restaurants'
}

function mapEssentialsToDeal(p: {
  id: string
  name: string
  unit: string
  price: number
  mrp?: number | null
  image: string | null
  storeType: string
}): DealProduct {
  return {
    id: p.id,
    name: p.name,
    unit: p.unit,
    price: p.price,
    mrp: p.mrp ?? null,
    image: p.image,
    shopId: ESSENTIALS_STORE_ID,
    shopName: ESSENTIALS_STORE_NAME,
    shopSlug: ESSENTIALS_STORE_SLUG,
    storeType: p.storeType,
    stock: 99,
    shopRating: 4.5,
  }
}

function readCachedDeals(): DealProduct[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(HOME_DEALS_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DealProduct[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCachedDeals(deals: DealProduct[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(HOME_DEALS_CACHE_KEY, JSON.stringify(deals))
  } catch {
    // ignore quota errors
  }
}

function pickHomeDeals(all: DealProduct[], categoryActive: boolean): DealProduct[] {
  if (categoryActive) {
    return filterTopRatedDeals(
      all,
      new Map(all.map((d) => [d.shopId, d.shopRating ?? 0])),
      true,
    )
  }

  const withImages = all.filter((d) => d.image?.trim())
  const withoutImages = all.filter((d) => !d.image?.trim())
  const picked = shuffle(withImages).slice(0, 8)
  if (picked.length < 8) {
    picked.push(...shuffle(withoutImages).slice(0, 8 - picked.length))
  }
  return picked
}

const STORE_PLACEHOLDERS: Record<string, { emoji: string; bg: string }> = {
  KIRANA: { emoji: '🛒', bg: 'bg-orange-100' },
  FISH: { emoji: '🐟', bg: 'bg-blue-100' },
  VEGETABLE: { emoji: '🥦', bg: 'bg-green-100' },
  PHARMACY: { emoji: '💊', bg: 'bg-red-100' },
  DAIRY: { emoji: '🥛', bg: 'bg-yellow-100' },
  BAKERY: { emoji: '🍞', bg: 'bg-amber-100' },
  GENERAL: { emoji: '📦', bg: 'bg-gray-100' },
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function ShopSkeleton() {
  return (
    <div className="w-[160px] shrink-0 animate-pulse overflow-hidden rounded-lg bg-white">
      <div className="h-[100px] bg-[#F0F0F0]" />
      <div className="space-y-2 p-2">
        <div className="h-3 w-3/4 rounded bg-[#F0F0F0]" />
        <div className="h-2 w-1/2 rounded bg-[#F0F0F0]" />
      </div>
    </div>
  )
}

function toUnifiedProduct(
  product: DealProduct,
  variant: 'GROCERY' | 'RETAIL',
): UnifiedProductData {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    mrp: product.mrp,
    unit: product.unit,
    image: product.image,
    storeId: product.shopId,
    storeName: product.shopName,
    storeType: product.storeType,
    stock: product.stock,
    optionCount: variant === 'RETAIL' ? 4 : undefined,
    sizes: variant === 'RETAIL' ? ['S', 'M', 'L', 'XL'] : undefined,
    colors: variant === 'RETAIL' ? ['Black', 'Navy'] : undefined,
  }
}

function ViewCartBar() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total())
  const count = useCartStore((s) => s.itemCount())

  if (items.length === 0) return null

  return (
    <button
      type="button"
      onClick={() => router.push('/cart')}
      className="fixed bottom-14 left-0 right-0 z-50 mx-auto flex h-14 max-w-[480px] translate-y-0 items-center justify-between bg-[#FF3F6C] px-4 text-white transition-transform duration-300"
    >
      <span className="flex items-center gap-2 text-sm font-bold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#FF3F6C]">
          {count}
        </span>
        {count} item{count !== 1 ? 's' : ''} · {formatCurrency(total)}
      </span>
      <span className="text-sm font-bold">View Cart →</span>
    </button>
  )
}

function HomeShopCard({ shop }: { shop: ShopListItem }) {
  const ratingLabel =
    shop.ratingCount && shop.ratingCount > 0
      ? shop.ratingAvg?.toFixed(1) ?? '4.2'
      : 'New'

  return (
    <Link href={`/shops/${shop.slug}`} className="w-[160px] shrink-0 overflow-hidden rounded-lg bg-white">
      <div className="relative h-[100px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveImageSrc(shop.image)}
          alt=""
          loading="eager"
          className="h-full w-full object-cover"
        />
        {shop.isActive && (
          <span className="absolute left-1.5 top-1.5 rounded bg-[#0C831F] px-1.5 py-0.5 text-[10px] font-bold text-white">
            OPEN
          </span>
        )}
        {(shop.ratingAvg ?? 0) >= TOP_RATED_MIN && (
          <span className="absolute right-1.5 top-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-white">
            TOP
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-[13px] font-bold text-[#1C1C1C]">{shop.name}</p>
        <p className="text-[11px] font-semibold text-[#FF6B35]">{shop.category}</p>
        <p className="text-[11px] text-[#878787]">
          ⭐ {ratingLabel} · {shop.etaMinutes} mins
        </p>
        <p className="text-[11px] text-[#878787]">
          {shop.deliveryFee === 0 ? 'FREE' : `₹${shop.deliveryFee} delivery`}
        </p>
      </div>
    </Link>
  )
}

function filterTopRatedDeals(
  deals: DealProduct[],
  shopRatings: Map<string, number>,
  categoryActive: boolean,
): DealProduct[] {
  if (!categoryActive || deals.length === 0) return deals

  const topShopIds = [...shopRatings.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_SHOP_LIMIT)
    .map(([id]) => id)

  return deals
    .filter((d) => {
      const rating = shopRatings.get(d.shopId) ?? d.shopRating ?? 0
      return rating >= TOP_RATED_MIN || topShopIds.includes(d.shopId)
    })
    .sort(
      (a, b) =>
        (shopRatings.get(b.shopId) ?? b.shopRating ?? 0) -
        (shopRatings.get(a.shopId) ?? a.shopRating ?? 0),
    )
    .slice(0, 12)
}

export function HomeFeed() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { config: feedConfig } = useHomeFeedConfig()
  const coordinates = useLocationStore((s) => s.coordinates)
  const formattedAddress = useLocationStore((s) => s.formattedAddress)
  const cartTotal = useCartStore((s) => s.total())

  const [subPlatform, setSubPlatform] = useState<SubPlatformId>(() =>
    parseSubPlatformId(searchParams.get('platform')),
  )
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [shops, setShops] = useState<ShopListItem[]>([])
  const [deals, setDeals] = useState<DealProduct[]>(() => readCachedDeals())
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [dealsError, setDealsError] = useState<string | null>(null)
  const [catalogSource, setCatalogSource] = useState<'global' | 'marketplace' | null>(null)
  const { isLoggedIn: loggedIn } = useAuth()
  const [buyAgainTab, setBuyAgainTab] = useState('all')
  const [promoModalOpen, setPromoModalOpen] = useState(false)

  const dealsRef = useRef<HTMLDivElement>(null)
  const couponsRef = useRef<HTMLDivElement>(null)

  const lat = coordinates?.lat ?? SAVED_LOCATIONS[0].latitude
  const lng = coordinates?.lng ?? SAVED_LOCATIONS[0].longitude

  const platformConfig = SUB_PLATFORM_CONFIG[subPlatform]
  const toggles = feedConfig.componentToggles ?? DEFAULT_COMPONENT_TOGGLES
  const categoryTabs = feedConfig.categoryTabs.filter((t) => t.active !== false)
  const tab = categoryTabs.find((t) => t.id === activeCategory)
  const storeType = tab?.storeType

  const subPlatformLabelOverrides = useMemo(() => {
    const map: Partial<Record<SubPlatformId, string>> = {}
    for (const t of feedConfig.subPlatformTabs) {
      if (t.id === 'restaurants' || (t.id as string) === 'fresh') {
        map.restaurants = t.label === 'Fresh Farm' ? 'Restaurants / Cafés' : t.label
      } else {
        map[t.id] = t.label
      }
    }
    return map
  }, [feedConfig.subPlatformTabs])

  const handleSubPlatformChange = useCallback(
    (next: SubPlatformId) => {
      const tabConfig = feedConfig.subPlatformTabs.find((t) => t.id === next)
      if (tabConfig?.route?.trim()) {
        router.push(tabConfig.route.trim())
        return
      }
      setSubPlatform(next)
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'all') params.delete('platform')
      else params.set('platform', next)
      const query = params.toString()
      router.replace(query ? `/?${query}` : '/', { scroll: false })
    },
    [router, searchParams, feedConfig.subPlatformTabs],
  )

  useEffect(() => {
    setSubPlatform(parseSubPlatformId(searchParams.get('platform')))
  }, [searchParams])

  useEffect(() => {
    if (!isMarketplaceSubPlatform(subPlatform)) {
      setShops([])
      setLoadingShops(false)
      return
    }

    let cancelled = false
    setLoadingShops(true)

    async function loadShops() {
      const nearby = await getNearbyShops({
        lat,
        lng,
        radiusKm: 15,
        storeType,
        openOnly: true,
        sortBy: 'distance',
      })

      if (cancelled) return

      if (nearby.length > 0) {
        setShops(nearby)
        setLoadingShops(false)
        return
      }

      try {
        const fallbackUrl = storeType ? `/api/shops?storeType=${storeType}` : '/api/shops'
        const res = await fetch(fallbackUrl)
        const json = await res.json()
        if (json.success && !cancelled) {
          const mapped: ShopListItem[] = (json.data ?? []).map(
            (s: {
              id: string
              slug: string
              name: string
              category: string
              image: string | null
              deliveryFee?: number
              etaMinutes?: number
              ratingAvg?: number
              ratingCount?: number
            }) => ({
              id: s.id,
              slug: s.slug,
              name: s.name,
              category: s.category,
              image: s.image,
              isActive: true,
              deliveryFee: s.deliveryFee ?? 20,
              minOrderValue: 0,
              distanceKm: 0,
              etaMinutes: s.etaMinutes ?? 15,
              ratingAvg: s.ratingAvg ?? 0,
              ratingCount: s.ratingCount ?? 0,
            }),
          )
          mapped.sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0))
          setShops(mapped)
        }
      } catch {
        if (!cancelled) setShops([])
      } finally {
        if (!cancelled) setLoadingShops(false)
      }
    }

    void loadShops()
    return () => {
      cancelled = true
    }
  }, [lat, lng, storeType, subPlatform])

  useEffect(() => {
    let cancelled = false
    setLoadingDeals(true)
    setDealsError(null)

    async function loadDeals() {
      try {
        if (isMarketplaceSubPlatform(subPlatform)) {
          setCatalogSource('marketplace')
          const url =
            subPlatform === 'restaurants'
              ? '/api/shops?vertical=restaurants'
              : storeType
                ? `/api/shops?storeType=${storeType}`
                : '/api/shops?storeType=GENERAL'
          const res = await fetch(url)
          const json = await res.json()
          if (cancelled || !json.success) {
            if (!cancelled) setDeals([])
            return
          }
          const all: DealProduct[] = []
          for (const shop of json.data ?? []) {
            const shopRating = Number(shop.ratingAvg ?? 0)
            for (const p of shop.products ?? []) {
              all.push({
                id: p.id,
                name: p.name,
                unit: p.weight ?? p.unit ?? '',
                price: p.price,
                mrp: p.mrp ?? null,
                image: p.image ?? null,
                shopId: shop.id,
                shopName: shop.name,
                shopSlug: shop.slug,
                storeType: shop.storeType,
                stock: p.stock,
                shopRating,
              })
            }
          }
          const filtered = pickHomeDeals(all, false)
          if (!cancelled) {
            setDeals(filtered)
            writeCachedDeals(filtered)
          }
          return
        }

        // Essentials — global master catalog (not per-shop dummy data)
        setCatalogSource('global')
        const params = new URLSearchParams({ limit: '48' })
        if (storeType && ESSENTIALS_STORE_TYPES.has(storeType)) {
          params.set('storeType', storeType)
        }
        const res = await fetch(`/api/catalog/essentials?${params}`)
        const json = await res.json()
        if (cancelled) return
        if (!json.success) {
          setDeals([])
          setDealsError(json.error ?? 'Could not load global catalog')
          return
        }
        const mapped = (json.data ?? []).map(mapEssentialsToDeal)
        const filtered = pickHomeDeals(mapped, false)
        setDeals(filtered)
        writeCachedDeals(filtered)
      } catch {
        if (!cancelled) {
          setDeals([])
          setDealsError('Network error — pull to refresh')
        }
      } finally {
        if (!cancelled) setLoadingDeals(false)
      }
    }

    void loadDeals()
    return () => {
      cancelled = true
    }
  }, [storeType, subPlatform])

  const bannerProducts = useMemo(() => deals.slice(0, 4), [deals])

  const promoModalProducts = useMemo(
    () => [...deals].sort((a, b) => a.price - b.price),
    [deals],
  )

  const lowestDealPrice = promoModalProducts[0]?.price
  const cartItems = useCartStore((s) => s.items)
  const showFreeDeliveryBar = cartTotal < 99 && cartItems.length === 0
  const remainingForFree = Math.max(0, 99 - cartTotal)

  const scrollToDeals = useCallback(() => {
    dealsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToCoupons = useCallback(() => {
    couponsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    )
  }, [searchQuery, shops])

  const platformDeals = useMemo(() => {
    let list = deals
    if (platformConfig.storeTypes?.length) {
      list = list.filter(
        (d) => !d.storeType || platformConfig.storeTypes!.includes(d.storeType),
      )
    }
    if (subPlatform === 'fashion') {
      return list
    }
    return list
  }, [deals, platformConfig.storeTypes, subPlatform])

  const showMarketplaceStores = isMarketplaceSubPlatform(subPlatform)

  const locationArea = formattedAddress ?? SAVED_LOCATIONS[0].area
  const deliveryHeaderLabel =
    subPlatform === 'all' || subPlatform === 'grocery'
      ? '⚡ 10 Minutes'
      : platformConfig.etaLabel

  const promoBannerSection =
    toggles.promoBanner ? (
      <section className="mb-2 px-5">
        <button
          type="button"
          onClick={() => setPromoModalOpen(true)}
          className={cn(
            'relative flex h-[180px] w-full cursor-pointer items-center overflow-hidden rounded-[22px] px-6 text-left transition active:scale-[0.99]',
            !feedConfig.promoBanner.image &&
              'bg-gradient-to-br from-[#FF6B35] via-[#FF7043] to-[#FFB74D] shadow-[0_8px_32px_rgba(255,107,53,0.25)]',
          )}
        >
          {feedConfig.promoBanner.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={feedConfig.promoBanner.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/45" />
            </>
          ) : null}
          <div className="relative z-10 max-w-[52%]">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">
              {feedConfig.promoBanner.badge}
            </p>
            <p className="mt-1 text-3xl font-bold leading-tight text-white">
              {feedConfig.promoBanner.headline ?? 'Products Starting from Just ₹1!'}
            </p>
            <p className="mt-2 text-sm text-white/90">
              {lowestDealPrice != null
                ? `From ${formatCurrency(lowestDealPrice)} · Tap to explore`
                : feedConfig.promoBanner.subtitle}
            </p>
            <span className="mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#FF6B35] shadow-md">
              Shop Now
            </span>
          </div>
          <div className="absolute -right-1 bottom-0 top-0 flex items-center pr-2">
            <div className="grid grid-cols-2 gap-2">
              {bannerProducts.map((p) => (
                <div
                  key={p.id}
                  className="relative overflow-hidden rounded-xl border-2 border-white/30 bg-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageSrc(p.image)}
                    alt=""
                    loading="eager"
                    className="h-[72px] w-[72px] object-cover"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-[#0C831F] py-0.5 text-center text-[9px] font-bold text-white">
                    {formatCurrency(p.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </button>
      </section>
    ) : null

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      if (categoryId === 'all') {
        setActiveCategory('all')
        return
      }
      const tab = categoryTabs.find((t) => t.id === categoryId)
      const slug = tab?.storeType
        ? (STORE_TYPE_LINK[tab.storeType] ?? categoryId)
        : categoryId
      router.push(resolveCategoryHref(slug))
    },
    [router, categoryTabs],
  )

  const storesSection = showMarketplaceStores ? (
    <section className="mb-2 bg-white p-4">
      <h2 className="text-lg font-bold text-[#1C1C1C]">{feedConfig.storesSection.title}</h2>
      <p className="text-xs text-[#878787]">
        {subPlatform === 'fashion'
          ? feedConfig.storesSection.subtitleFashion
          : feedConfig.storesSection.subtitleGrocery}
      </p>
      <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide">
        {loadingShops ? (
          <>
            <ShopSkeleton />
            <ShopSkeleton />
            <ShopSkeleton />
          </>
        ) : shops.length === 0 ? (
          <p className="text-sm text-[#878787]">No stores nearby.</p>
        ) : (
          shops.map((shop) => <HomeShopCard key={shop.id} shop={shop} />)
        )}
      </div>
    </section>
  ) : null

  const flashDealsSection = toggles.flashDeals ? (
    <section ref={dealsRef} className="mb-2 scroll-mt-28 bg-white p-4">
      <h2 className="text-lg font-bold text-[#1C1C1C]">
        {subPlatform === 'fashion'
          ? feedConfig.dealsSection.fashionTitle
          : feedConfig.dealsSection.title}
      </h2>
      <p className="text-xs text-[#878787]">
        {subPlatform === 'fashion'
          ? feedConfig.dealsSection.fashionSubtitle
          : catalogSource === 'global'
            ? 'Live from Rabbit Global Catalog · nearest dark store fulfills'
            : feedConfig.dealsSection.subtitle}
      </p>
      {loadingDeals ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-[#F0F0F0]" />
          ))}
        </div>
      ) : dealsError ? (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-red-700">{dealsError}</p>
          <p className="mt-1 text-xs text-red-500">Check your connection and try again.</p>
        </div>
      ) : platformDeals.length === 0 ? (
        <p className="mt-4 text-sm text-[#878787]">No items available in this category yet.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {platformDeals.map((p) => (
            <UnifiedProductCard
              key={p.id}
              product={toUnifiedProduct(p, platformConfig.productVariant)}
              variant={platformConfig.productVariant}
              eagerImage
            />
          ))}
        </div>
      )}
    </section>
  ) : null

  return (
    <div className="mx-auto min-h-screen max-w-[480px] scroll-smooth bg-[#F5F5F5] font-sans shadow-xl">
      {/* Premium header + search */}
      <div className="sticky top-0 z-50 bg-[#F5F5F5]">
        <header className="bg-gradient-to-b from-[#E8F5E9] to-[#F1F8E9] px-5 pt-4 pb-6">
          <div className="flex min-h-[72px] items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[26px] font-bold leading-none text-black">{deliveryHeaderLabel}</p>
              <p className="mt-1 text-sm font-medium leading-tight text-[#878787]">
                Home • {locationArea}{' '}
                <ChevronDown className="mb-0.5 inline h-3.5 w-3.5" />
              </p>
            </div>
            <StorefrontProfileButton />
          </div>
        </header>

        <div className="relative z-10 -mt-3 px-5 pb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const q = searchQuery.trim()
              if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
            }}
          >
            <RotatingSearchBar
              variant="premium"
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={(term) => {
                router.push(`/search?q=${encodeURIComponent(term)}`)
              }}
              results={
                searchResults.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    {searchResults.map((s) => (
                      <Link
                        key={s.id}
                        href={`/shops/${s.slug}`}
                        className="block border-t border-[#F0F0F0] px-4 py-3 text-sm hover:bg-[#F8F8F8]"
                        onClick={() => setSearchQuery('')}
                      >
                        <span className="font-semibold text-[#1C1C1C]">{s.name}</span>
                        <span className="ml-2 text-xs text-[#878787]">{s.category}</span>
                      </Link>
                    ))}
                  </div>
                ) : null
              }
            />
          </form>
        </div>
      </div>

      {/* Service tabs */}
      <section className="mt-4 px-5">
        <SubPlatformTabs
          variant="cards"
          activeTab={subPlatform}
          onChange={handleSubPlatformChange}
          labelOverrides={subPlatformLabelOverrides}
        />
      </section>

      {/* Filter chips */}
      {toggles.categoryBar && (
        <section className="mt-6 px-5">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide py-1">
            {HOME_FILTER_CHIPS.map((chip) => {
              const active = activeCategory === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleCategorySelect(chip.id)}
                  className={cn(
                    'shrink-0 border-b-[3px] px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
                    active
                      ? 'border-[#FF6B35] text-[#FF6B35]'
                      : 'border-transparent text-[#878787]',
                  )}
                >
                  {chip.emoji} {chip.label}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Promotional banner */}
      <div className="mt-6">{promoBannerSection}</div>

      {/* Main scrollable content */}
      <div className="py-2">
        {/* Fashion deals scroller */}
        {platformConfig.showFashionDeals && (
          <section className="mb-2 bg-white p-4">
            <h2 className="text-lg font-bold text-[#1C1C1C]">
              {feedConfig.dealsSection.fashionTitle}
            </h2>
            <p className="text-xs text-[#878787]">{feedConfig.dealsSection.fashionSubtitle}</p>
            <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
              {feedConfig.fashionDealBadges.map((badge) => (
                <button
                  key={badge.label}
                  type="button"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#FBCFE8] bg-gradient-to-r from-[#FFF1F2] to-[#FDF2F8] px-3 py-2 text-left shadow-sm transition active:scale-[0.98]"
                >
                  <span className="rounded-full bg-[#1C1C1C] px-2 py-0.5 text-[9px] font-bold text-white">
                    {badge.tag}
                  </span>
                  <span className="text-[12px] font-bold text-[#1C1C1C]">{badge.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Restaurants / Cafés — inline when tab selected */}
        {subPlatform === 'restaurants' && (
          <RestaurantsHomeSection />
        )}

        {/* Grocery & Kitchen */}
        {toggles.grocerySection && platformConfig.showGroceryLayouts && subPlatform !== 'restaurants' && (
        <section className="mb-2 bg-white p-4">
          <h2 className="text-lg font-bold text-[#1C1C1C]">{feedConfig.groceryKitchen.title}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {feedConfig.groceryKitchen.row1.map((item) => (
              <HomeCategoryTile key={item.label} {...item} tall />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {feedConfig.groceryKitchen.row2.map((item) => (
              <HomeCategoryTile key={item.label} {...item} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {feedConfig.groceryKitchen.row3.map((item) => (
              <HomeCategoryTile key={item.label} {...item} />
            ))}
          </div>
        </section>
        )}

        {/* Snacks & Drinks */}
        {toggles.snacksSection && platformConfig.showGroceryLayouts && subPlatform !== 'restaurants' && (
        <section className="mb-2 bg-white p-4">
          <h2 className="text-lg font-bold text-[#1C1C1C]">{feedConfig.snacksDrinks.title}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {feedConfig.snacksDrinks.row1.map((item) => (
              <HomeCategoryTile key={item.label} {...item} tall />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {feedConfig.snacksDrinks.row2.map((item) => (
              <HomeCategoryTile key={item.label} {...item} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {feedConfig.snacksDrinks.row3.map((item) => (
              <HomeCategoryTile key={item.label} {...item} />
            ))}
          </div>
        </section>
        )}

        {/* Promo banner ad */}
        <section className="mb-2 px-4">
          <AdBanner placement="HOME_BANNER" className="h-36 w-full" />
        </section>

        <PromoDealsModal
          open={promoModalOpen}
          onClose={() => setPromoModalOpen(false)}
          products={promoModalProducts}
          headline={feedConfig.promoBanner.headline ?? 'Products Starting from Just ₹1!'}
        />

        {flashDealsSection}

        {/* Coupons */}
        {toggles.coupons && (
        <section ref={couponsRef} className="mb-2 scroll-mt-28 bg-white p-4">
          <h2 className="text-lg font-bold text-[#1C1C1C]">Coupons & offers</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide">
            {feedConfig.coupons.map((c) => (
              <div
                key={c.title}
                className="min-w-[140px] shrink-0 overflow-hidden rounded-xl border-[1.5px] border-[#0C831F] bg-white"
              >
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="h-16 w-full object-cover" />
                ) : null}
                <div className="p-3">
                  <div className="mb-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0C831F]">
                    <Percent className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-base font-bold text-[#1C1C1C]">{c.title}</p>
                  <p className="text-[11px] text-[#878787]">{c.sub}</p>
                  <p className="mt-2 text-[10px] text-[#878787]">{c.cashback}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {storesSection}

        {/* Buy Again */}
        {loggedIn && (
          <section className="mb-2 bg-white p-4">
            <h2 className="text-lg font-bold text-[#1C1C1C]">Buy Again</h2>
            <div className="mt-2 flex gap-2">
              {['all', 'kirana', 'fish'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setBuyAgainTab(tab)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                    buyAgainTab === tab
                      ? 'bg-[#FF3F6C] text-white'
                      : 'border border-[#F0F0F0] text-[#878787]',
                  )}
                >
                  {tab === 'all' ? 'All Items' : tab}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide">
              {deals.slice(0, 6).map((p) => (
                <Link key={p.id} href={`/shops/${p.shopSlug}`} className="w-[88px] shrink-0">
                  <div className="h-20 w-20 overflow-hidden rounded-lg bg-[#F8F8F8]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageSrc(p.image)}
                      alt=""
                      loading="eager"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] font-semibold text-[#1C1C1C]">
                    {p.name}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Offers floating button */}
      <button
        type="button"
        onClick={scrollToCoupons}
        className="fixed bottom-[118px] left-1/2 z-40 -translate-x-1/2 rounded-[20px] border border-[#E0E0E0] bg-white px-4 py-1.5 text-[13px] font-bold text-[#1C1C1C] shadow-md"
      >
        Offers ∧
      </button>

      <ViewCartBar />

      {/* Free delivery floating bar */}
      {showFreeDeliveryBar && (
        <button
          type="button"
          onClick={scrollToDeals}
          className="fixed bottom-14 left-0 right-0 z-40 mx-auto flex h-12 max-w-[480px] items-center justify-between bg-black/85 px-4 backdrop-blur-sm"
        >
          <div className="text-left">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-white">
              <span>🐰</span> Unlock free delivery
            </p>
            <p className="text-[11px] text-white/70">
              Shop for ₹{remainingForFree} more
            </p>
          </div>
          <ChevronUp className="h-5 w-5 text-white" />
        </button>
      )}
    </div>
  )
}
