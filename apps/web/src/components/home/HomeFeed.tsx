'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronUp, Percent } from 'lucide-react'
import { RotatingSearchBar } from '@/components/navigation/RotatingSearchBar'
import { SubPlatformTabs } from '@/components/navigation/SubPlatformTabs'
import {
  UnifiedProductCard,
  type UnifiedProductData,
} from '@/components/products/UnifiedProductCard'
import {
  FASHION_DEAL_BADGES,
  SUB_PLATFORM_CONFIG,
  parseSubPlatformId,
  type SubPlatformId,
} from '@/lib/sub-platforms'
import { useLocationStore, useCartStore } from '@/store'
import { SAVED_LOCATIONS } from '@/lib/constants'
import { HOME_CATEGORY_TABS } from '@/lib/categories'
import { getNearbyShops, type ShopListItem } from '@/actions/shops'
import { getSessionAction } from '@/actions/auth'
import { cn, formatCurrency } from '@/lib/utils'
import { AdBanner } from '@/components/ads/AdBanner'

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

const FASHION_FALLBACK_DEALS: DealProduct[] = [
  {
    id: 'fashion-1',
    name: 'Urban Runner Sneakers',
    unit: 'UK 6-11',
    price: 549,
    mrp: 1299,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    shopId: 'boutique-hub',
    shopName: 'Boutique Hub',
    shopSlug: 'boutique-hub',
    storeType: 'GENERAL',
  },
  {
    id: 'fashion-2',
    name: 'Linen Casual Shirt',
    unit: 'S-XXL',
    price: 499,
    mrp: 999,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
    shopId: 'boutique-hub',
    shopName: 'Boutique Hub',
    shopSlug: 'boutique-hub',
    storeType: 'GENERAL',
  },
  {
    id: 'fashion-3',
    name: 'High-Rise Slim Jeans',
    unit: '28-36',
    price: 599,
    mrp: 1499,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
    shopId: 'boutique-hub',
    shopName: 'Boutique Hub',
    shopSlug: 'boutique-hub',
    storeType: 'GENERAL',
  },
  {
    id: 'fashion-4',
    name: 'Everyday Tote Bag',
    unit: 'One Size',
    price: 399,
    mrp: 799,
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
    shopId: 'boutique-hub',
    shopName: 'Boutique Hub',
    shopSlug: 'boutique-hub',
    storeType: 'GENERAL',
  },
]

const COUPONS = [
  { title: 'FLAT ₹50 OFF', sub: 'above ₹199', cashback: 'Get ₹50 cashback on UPI' },
  { title: 'FLAT ₹20 OFF', sub: 'above ₹299', cashback: 'Get ₹20 off on cards' },
  { title: 'FLAT ₹100 OFF', sub: 'above ₹400', cashback: 'Get ₹100 off on fish' },
]

const GROCERY_KITCHEN = {
  row1: [
    {
      label: 'Fruits & Vegetables',
      image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300',
      category: 'veggies',
    },
    {
      label: 'Dairy, Bread & Eggs',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300',
      category: 'dairy',
    },
  ],
  row2: [
    {
      label: 'Atta, Rice, Oil & Dals',
      image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200',
      category: 'kirana',
    },
    {
      label: 'Meat, Fish & Eggs',
      image: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=200',
      category: 'fish',
    },
    {
      label: 'Masala & Dry Fruits',
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200',
      category: 'kirana',
    },
  ],
  row3: [
    {
      label: 'Breakfast & Sauces',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
      category: 'kirana',
    },
    {
      label: 'Packaged Food',
      image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200',
      category: 'kirana',
    },
    {
      label: 'Frozen Food',
      image: 'https://images.unsplash.com/photo-1581088654672-8f1e3a8c9d72?w=200',
      category: 'kirana',
    },
  ],
}

const SNACKS_DRINKS = {
  row1: [
    {
      label: 'Tea, Coffee & More',
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300',
      category: 'kirana',
    },
    {
      label: 'Ice Creams & More',
      image: 'https://images.unsplash.com/photo-1567206563114-c179706a56c8?w=300',
      category: 'dairy',
    },
  ],
  row2: [
    {
      label: 'Sweet Cravings',
      image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200',
      category: 'bakery',
    },
    {
      label: 'Cold Drinks & Juices',
      image: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=200',
      category: 'kirana',
    },
    {
      label: 'Munchies',
      image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200',
      category: 'kirana',
    },
  ],
  row3: [
    {
      label: 'Biscuits & Cookies',
      image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200',
      category: 'kirana',
    },
    {
      label: 'Noodles & Pasta',
      image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=200',
      category: 'kirana',
    },
    {
      label: 'Spreads & Dips',
      image: 'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=200',
      category: 'kirana',
    },
  ],
}

function CategoryCard({
  label,
  image,
  category,
  tall,
}: {
  label: string
  image: string
  category: string
  tall?: boolean
}) {
  return (
    <Link
      href={`/shops?category=${category}`}
      className="overflow-hidden rounded-xl bg-[#F8F8F8]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        loading="lazy"
        className={cn('w-full object-cover', tall ? 'h-[120px]' : 'h-[90px]')}
      />
      <p className="p-2 text-sm font-bold leading-tight text-[#1C1C1C]">{label}</p>
    </Link>
  )
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
  return (
    <Link href={`/shops/${shop.slug}`} className="w-[160px] shrink-0 overflow-hidden rounded-lg bg-white">
      <div className="relative h-[100px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            shop.image ??
            'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=400'
          }
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {shop.isActive && (
          <span className="absolute left-1.5 top-1.5 rounded bg-[#0C831F] px-1.5 py-0.5 text-[10px] font-bold text-white">
            OPEN
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-[13px] font-bold text-[#1C1C1C]">{shop.name}</p>
        <p className="text-[11px] font-semibold text-[#FF6B35]">{shop.category}</p>
        <p className="text-[11px] text-[#878787]">
          ⭐ 4.2 · {shop.etaMinutes} mins
        </p>
        <p className="text-[11px] text-[#878787]">
          {shop.deliveryFee === 0 ? 'FREE' : `₹${shop.deliveryFee} delivery`}
        </p>
      </div>
    </Link>
  )
}

export function HomeFeed() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const coordinates = useLocationStore((s) => s.coordinates)
  const cartTotal = useCartStore((s) => s.total())

  const [subPlatform, setSubPlatform] = useState<SubPlatformId>(() =>
    parseSubPlatformId(searchParams.get('platform')),
  )
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [shops, setShops] = useState<ShopListItem[]>([])
  const [deals, setDeals] = useState<DealProduct[]>([])
  const [loadingShops, setLoadingShops] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [buyAgainTab, setBuyAgainTab] = useState('all')

  const dealsRef = useRef<HTMLDivElement>(null)
  const couponsRef = useRef<HTMLDivElement>(null)

  const lat = coordinates?.lat ?? SAVED_LOCATIONS[0].latitude
  const lng = coordinates?.lng ?? SAVED_LOCATIONS[0].longitude

  const platformConfig = SUB_PLATFORM_CONFIG[subPlatform]
  const tab = HOME_CATEGORY_TABS.find((t) => t.id === activeCategory)
  const storeType = tab?.storeType

  const handleSubPlatformChange = useCallback(
    (next: SubPlatformId) => {
      setSubPlatform(next)
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'all') params.delete('platform')
      else params.set('platform', next)
      const query = params.toString()
      router.replace(query ? `/?${query}` : '/', { scroll: false })
    },
    [router, searchParams],
  )

  useEffect(() => {
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
        const res = await fetch('/api/shops')
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
            }),
          )
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
  }, [lat, lng, storeType])

  useEffect(() => {
    const url = storeType ? `/api/shops?storeType=${storeType}` : '/api/shops'
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return
        const all: DealProduct[] = []
        for (const shop of json.data ?? []) {
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
            })
          }
        }
        // Show more items when a category is selected (it's the focus of the page)
        setDeals(shuffle(all).slice(0, storeType ? 12 : 8))
      })
      .catch(() => {})
  }, [storeType])

  useEffect(() => {
    getSessionAction().then((s) => setLoggedIn(!!s))
  }, [])

  const bannerProducts = useMemo(() => deals.slice(0, 4), [deals])
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
      const merged = [...FASHION_FALLBACK_DEALS, ...list]
      const seen = new Set<string>()
      return merged.filter((item) => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })
    }
    return list
  }, [deals, platformConfig.storeTypes, subPlatform])

  return (
    <div className="mx-auto min-h-screen max-w-[480px] scroll-smooth bg-[#F0F0F0] font-sans shadow-xl">
      {/* SECTION A: Top search bar */}
      <div className="sticky top-0 z-50 border-b border-[#F0F0F0] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-[60%]">
            <RotatingSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              results={
                searchResults.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    {searchResults.map((s) => (
                      <Link
                        key={s.id}
                        href={`/shops/${s.slug}`}
                        className="block border-t border-[#F0F0F0] px-3 py-2.5 text-sm hover:bg-[#F8F8F8]"
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
          </div>

          <div
            className={cn(
              'flex h-10 w-[40%] items-center justify-center rounded-lg px-2 py-1 transition-colors duration-300',
              platformConfig.etaTone,
            )}
          >
            <p className="text-center text-[11px] font-bold leading-tight">
              {platformConfig.etaLabel}
            </p>
          </div>
        </div>

        <SubPlatformTabs
          activeTab={subPlatform}
          onChange={handleSubPlatformChange}
          className="px-0 pb-0 pt-2"
        />
      </div>

      {/* SECTION B: Category tabs */}
      <div className="sticky top-[116px] z-40 border-b border-[#F0F0F0] bg-white">
        <div className="flex overflow-x-auto px-4 scrollbar-hide">
          {HOME_CATEGORY_TABS.map((cat) => {
            const active = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'shrink-0 border-b-2 px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors',
                  active
                    ? 'border-[#FF6B35] text-[#FF6B35]'
                    : 'border-transparent text-[#878787]',
                )}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* SECTION C: Main scrollable content */}
      <div className="py-2">
        {/* Active category banner — shown when a specific category is selected */}
        {activeCategory !== 'all' && (
          <section className="mb-2 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1C1C1C]">{tab?.label}</h2>
                <p className="text-xs text-[#878787]">
                  {loadingShops
                    ? 'Finding stores near you…'
                    : `${shops.length} store${shops.length !== 1 ? 's' : ''} · ${deals.length} item${deals.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className="rounded-full border border-[#F0F0F0] px-3 py-1 text-xs font-semibold text-[#878787]"
              >
                Clear ✕
              </button>
            </div>
          </section>
        )}

        {/* Fashion deals scroller */}
        {platformConfig.showFashionDeals && activeCategory === 'all' && (
          <section className="mb-2 bg-white p-4">
            <h2 className="text-lg font-bold text-[#1C1C1C]">
              Fashion Deals: Everything Under ₹599
            </h2>
            <p className="text-xs text-[#878787]">Same-day style drops from local boutiques</p>
            <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
              {FASHION_DEAL_BADGES.map((badge) => (
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

        {/* Grocery & Kitchen */}
        {platformConfig.showGroceryLayouts && activeCategory === 'all' && (
        <section className="mb-2 bg-white p-4">
          <h2 className="text-lg font-bold text-[#1C1C1C]">Grocery & Kitchen</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {GROCERY_KITCHEN.row1.map((item) => (
              <CategoryCard key={item.label} {...item} tall />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {GROCERY_KITCHEN.row2.map((item) => (
              <CategoryCard key={item.label} {...item} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {GROCERY_KITCHEN.row3.map((item) => (
              <CategoryCard key={item.label} {...item} />
            ))}
          </div>
        </section>
        )}

        {/* Snacks & Drinks */}
        {platformConfig.showGroceryLayouts && activeCategory === 'all' && (
        <section className="mb-2 bg-white p-4">
          <h2 className="text-lg font-bold text-[#1C1C1C]">Snacks & Drinks</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SNACKS_DRINKS.row1.map((item) => (
              <CategoryCard key={item.label} {...item} tall />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SNACKS_DRINKS.row2.map((item) => (
              <CategoryCard key={item.label} {...item} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SNACKS_DRINKS.row3.map((item) => (
              <CategoryCard key={item.label} {...item} />
            ))}
          </div>
        </section>
        )}

        {/* Promo banner ad */}
        <section className="mb-2 px-4">
          <AdBanner placement="HOME_BANNER" className="h-36 w-full" />
        </section>

        {/* Deals Banner */}
        <section className="mb-2 px-4">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C61] p-4">
            <div>
              <p className="text-[11px] font-bold uppercase text-white/70">DEALS STARTING AT</p>
              <p className="text-5xl font-black text-white">₹9</p>
              <p className="text-xs text-white/80">Add Any 10 Items</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {bannerProducts.map((p) => (
                <div key={p.id} className="relative overflow-hidden rounded-lg bg-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      p.image ??
                      'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=100'
                    }
                    alt=""
                    className="h-[60px] w-[60px] object-cover"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-[#0C831F] py-0.5 text-center text-[9px] font-bold text-white">
                    {formatCurrency(p.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Flash Deals */}
        <section ref={dealsRef} className="mb-2 scroll-mt-28 bg-white p-4">
          <h2 className="text-lg font-bold text-[#1C1C1C]">
            {subPlatform === 'fashion'
              ? 'Boutique Picks: Under ₹599'
              : activeCategory === 'all'
                ? 'Flash Deals: All Time Low'
                : `${tab?.label} — Top Picks`}
          </h2>
          <p className="text-xs text-[#878787]">
            {subPlatform === 'fashion'
              ? 'Curated apparel, footwear & accessories'
              : 'Fresh Essentials Every Day'}
          </p>
          {platformDeals.length === 0 ? (
            <p className="mt-4 text-sm text-[#878787]">
              No items available in this category yet.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {platformDeals.map((p) => (
                <UnifiedProductCard
                  key={p.id}
                  product={toUnifiedProduct(p, platformConfig.productVariant)}
                  variant={platformConfig.productVariant}
                />
              ))}
            </div>
          )}
        </section>

        {/* Coupons */}
        <section ref={couponsRef} className="mb-2 scroll-mt-28 bg-white p-4">
          <h2 className="text-lg font-bold text-[#1C1C1C]">Coupons & offers</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide">
            {COUPONS.map((c) => (
              <div
                key={c.title}
                className="min-w-[140px] shrink-0 rounded-xl border-[1.5px] border-[#0C831F] bg-white p-3"
              >
                <div className="mb-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0C831F]">
                  <Percent className="h-3 w-3 text-white" />
                </div>
                <p className="text-base font-bold text-[#1C1C1C]">{c.title}</p>
                <p className="text-[11px] text-[#878787]">{c.sub}</p>
                <p className="mt-2 text-[10px] text-[#878787]">{c.cashback}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Nearby Shops */}
        <section className="mb-2 bg-white p-4">
          <h2 className="text-lg font-bold text-[#1C1C1C]">Stores near you</h2>
          <p className="text-xs text-[#878787]">
            {subPlatform === 'fashion' ? 'Same-day delivery available' : 'Delivering in 15-30 mins'}
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
                      src={
                        p.image ??
                        'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=200'
                      }
                      alt=""
                      loading="lazy"
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
