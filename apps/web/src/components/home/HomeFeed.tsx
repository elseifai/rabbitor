'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ChevronUp, Minus, Plus, Percent, User, Mic, ChevronDown } from 'lucide-react'
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

const SERVICE_TABS = [
  { id: 'rabbit', label: 'Rabbit' },
  { id: 'supermart', label: 'Super Mart' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'boutique', label: 'Boutique' },
] as const

const FILTER_CHIPS = [
  { categoryId: 'all', label: 'All', emoji: '🏠' },
  { categoryId: 'veggies', label: 'Fresh', emoji: '🥬' },
  { categoryId: 'dairy', label: 'Dairy', emoji: '🥛' },
  { categoryId: 'kirana', label: 'Fruits', emoji: '🍎' },
  { categoryId: 'bakery', label: 'Bakery', emoji: '🥖' },
  { categoryId: 'pharmacy', label: 'Pharmacy', emoji: '💊' },
] as const

const SHOP_BY_CATEGORY = [
  {
    label: 'Fruits & Vegetables',
    subtitle: 'Farm-fresh daily',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400',
    category: 'veggies',
  },
  {
    label: 'Dairy, Bread & Eggs',
    subtitle: 'Morning essentials',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    category: 'dairy',
  },
  {
    label: 'Atta, Rice & Dals',
    subtitle: 'Pantry staples',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400',
    category: 'kirana',
  },
  {
    label: 'Meat, Fish & Eggs',
    subtitle: 'Protein picks',
    image: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400',
    category: 'fish',
  },
  {
    label: 'Snacks & Beverages',
    subtitle: 'Quick bites & sips',
    image: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400',
    category: 'kirana',
  },
  {
    label: 'Bakery & Sweets',
    subtitle: 'Freshly baked',
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400',
    category: 'bakery',
  },
]

const COUPONS = [
  { title: 'FLAT ₹50 OFF', sub: 'above ₹199', cashback: 'Get ₹50 cashback on UPI' },
  { title: 'FLAT ₹20 OFF', sub: 'above ₹299', cashback: 'Get ₹20 off on cards' },
  { title: 'FLAT ₹100 OFF', sub: 'above ₹400', cashback: 'Get ₹100 off on fish' },
]

const CARD_SHADOW = 'shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
const CARD_SHADOW_HOVER = 'hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)]'
const CARD_RADIUS = 'rounded-3xl'
const SEARCH_SHADOW = 'shadow-[0_8px_28px_rgba(0,0,0,0.12)]'

const HERO_GROCERY_IMAGES = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
  'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200',
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200',
  'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200',
]

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1C1C1C]">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[#878787]">{subtitle}</p>}
    </div>
  )
}

function CategoryCard({
  label,
  subtitle,
  image,
  category,
}: {
  label: string
  subtitle: string
  image: string
  category: string
}) {
  return (
    <Link
      href={`/shops?category=${category}`}
      className={cn(
        'overflow-hidden bg-white transition-shadow',
        CARD_RADIUS,
        CARD_SHADOW,
        CARD_SHADOW_HOVER,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        loading="lazy"
        className="h-[152px] w-full object-cover"
      />
      <div className="p-4">
        <p className="text-lg font-semibold leading-tight text-[#1C1C1C]">{label}</p>
        <p className="mt-1 text-sm text-[#878787]">{subtitle}</p>
      </div>
    </Link>
  )
}

function ShopSkeleton() {
  return (
    <div className={cn('w-[168px] shrink-0 animate-pulse overflow-hidden bg-white', CARD_RADIUS, CARD_SHADOW)}>
      <div className="h-[100px] bg-[#F0F0F0]" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 rounded bg-[#F0F0F0]" />
        <div className="h-2 w-1/2 rounded bg-[#F0F0F0]" />
      </div>
    </div>
  )
}

function ProductDealCard({ product }: { product: DealProduct }) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id))
  const original = product.mrp && product.mrp > product.price ? product.mrp : null
  const discount = original
    ? Math.round(((original - product.price) / original) * 100)
    : 0
  const outOfStock = product.stock === 0
  const placeholder = STORE_PLACEHOLDERS[product.storeType ?? ''] ?? { emoji: '📦', bg: 'bg-gray-100' }

  return (
    <div className={cn('relative bg-white p-3', CARD_RADIUS, CARD_SHADOW)}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F8F8F8]">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center text-4xl', placeholder.bg)}>
            {placeholder.emoji}
          </div>
        )}
        {!outOfStock && discount > 0 && (
          <span className="absolute right-1 top-1 rounded bg-[#0C831F] px-1.5 py-0.5 text-[9px] font-bold text-white">
            {discount}% OFF
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold text-white">
            Out of Stock
          </div>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-base font-medium leading-snug text-[#1C1C1C]">
        {product.name}
      </p>
      <p className="text-sm text-[#878787]">{product.unit}</p>

      <div className="mt-2 flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-[#1C1C1C]">{formatCurrency(product.price)}</span>
          {original && (
            <span className="text-xs text-[#878787] line-through">{formatCurrency(original)}</span>
          )}
        </div>

        {!outOfStock &&
          (inCart ? (
            <div className="flex items-center gap-1 rounded-lg border border-[#0C831F] bg-white px-0.5 py-0.5">
              <button
                type="button"
                onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#0C831F] active:scale-95"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[16px] text-center text-sm font-bold text-[#0C831F]">
                {inCart.quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0C831F] text-white active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                addItem({
                  productId: product.id,
                  shopId: product.shopId,
                  shopName: product.shopName,
                  shopSlug: product.shopSlug,
                  name: product.name,
                  price: product.price,
                  unit: product.unit,
                  image: product.image ?? undefined,
                })
              }
              className="flex flex-col items-center rounded-lg border-[1.5px] border-[#FF3F6C] bg-white px-3 py-0.5 active:scale-95"
            >
              <span className="text-[13px] font-bold leading-none text-[#FF3F6C]">ADD</span>
              <span className="text-[10px] leading-none text-[#FF3F6C]">+</span>
            </button>
          ))}
      </div>
    </div>
  )
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
      className="fixed bottom-[88px] left-0 right-0 z-50 mx-auto flex h-14 max-w-[480px] translate-y-0 items-center justify-between rounded-2xl bg-[#FF3F6C] px-5 text-white shadow-[0_4px_20px_rgba(255,63,108,0.3)] transition-transform duration-300"
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
    <Link
      href={`/shops/${shop.slug}`}
      className={cn('w-[168px] shrink-0 overflow-hidden bg-white', CARD_RADIUS, CARD_SHADOW, CARD_SHADOW_HOVER)}
    >
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
  const location = useLocationStore((s) => s.location)
  const cartTotal = useCartStore((s) => s.total())

  const [activeCategory, setActiveCategory] = useState('all')
  const [activeService, setActiveService] = useState('rabbit')
  const [searchQuery, setSearchQuery] = useState('')
  const [shops, setShops] = useState<ShopListItem[]>([])
  const [deals, setDeals] = useState<DealProduct[]>([])
  const [loadingShops, setLoadingShops] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [buyAgainTab, setBuyAgainTab] = useState('all')

  const dealsRef = useRef<HTMLDivElement>(null)
  const couponsRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  const [heroPassed, setHeroPassed] = useState(false)

  const lat = location?.latitude ?? SAVED_LOCATIONS[0].latitude
  const lng = location?.longitude ?? SAVED_LOCATIONS[0].longitude

  const tab = HOME_CATEGORY_TABS.find((t) => t.id === activeCategory)
  const storeType = tab?.storeType

  const locationLabel = location?.label ?? 'Home'
  const locationArea = location?.area ?? SAVED_LOCATIONS[0].area

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

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setHeroPassed(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px -72px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const bannerProducts = useMemo(() => deals.slice(0, 4), [deals])
  const heroDisplayImages = useMemo(() => {
    const fromDeals = bannerProducts.map((p) => ({
      src: p.image ?? HERO_GROCERY_IMAGES[0],
      price: p.price,
    }))
    if (fromDeals.length >= 4) return fromDeals
    const fallbacks = HERO_GROCERY_IMAGES.map((src, i) => ({
      src,
      price: fromDeals[i]?.price,
    }))
    return [...fromDeals, ...fallbacks].slice(0, 4)
  }, [bannerProducts])
  const trendingProducts = useMemo(() => deals.slice(0, 4), [deals])
  const flashSaleProducts = useMemo(() => deals.slice(0, 8), [deals])
  const bestSellers = useMemo(() => [...deals].reverse().slice(0, 6), [deals])
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

  return (
    <div className="mx-auto min-h-screen max-w-[480px] scroll-smooth bg-[#F5F5F5] font-sans shadow-xl">
      {/* Compact sticky header + search */}
      <div className="sticky top-0 z-50 bg-[#F5F5F5]">
        <header className="bg-gradient-to-b from-[#E8F5E9] to-[#F1F8E9] px-5 pt-3 pb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[28px] font-bold leading-none text-black">⚡ 10 Minutes</p>
              <p className="mt-1 truncate text-sm font-medium leading-tight text-[#878787]">
                {locationLabel} • {locationArea}{' '}
                <ChevronDown className="mb-0.5 inline h-3.5 w-3.5" />
              </p>
            </div>
            <Link
              href="/profile"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
              aria-label="Profile"
            >
              <User className="h-5 w-5 text-[#1C1C1C]" />
            </Link>
          </div>
        </header>

        <div className="relative z-10 -mt-[11px] px-5 pb-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#878787]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search for "Milk, Fruits, Atta"'
              className={cn(
                'h-14 w-full bg-white pl-12 pr-12 text-base text-[#1C1C1C] outline-none placeholder:text-[#878787]',
                CARD_RADIUS,
                SEARCH_SHADOW,
              )}
            />
            <Mic className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#878787]" />
            {searchResults.length > 0 && (
              <div className={cn('absolute left-0 right-0 top-full z-50 mt-2 max-h-48 overflow-y-auto border border-[#F0F0F0] bg-white', CARD_RADIUS, SEARCH_SHADOW)}>
                {searchResults.map((s) => (
                  <Link
                    key={s.id}
                    href={`/shops/${s.slug}`}
                    className="block border-b border-[#F0F0F0] px-4 py-3 text-sm last:border-0 hover:bg-[#F8F8F8]"
                    onClick={() => setSearchQuery('')}
                  >
                    <span className="font-semibold text-[#1C1C1C]">{s.name}</span>
                    <span className="ml-2 text-xs text-[#878787]">{s.category}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service tabs */}
      <section className="mt-4 px-5">
        <div className="flex gap-5 overflow-x-auto scrollbar-hide py-1">
          {SERVICE_TABS.map((svc) => {
            const active = activeService === svc.id
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => setActiveService(svc.id)}
                className={cn(
                  'flex h-14 shrink-0 items-center rounded-[24px] border-0 px-7 text-base font-semibold outline-none transition-all',
                  active
                    ? 'bg-[#FFE8DE] text-[#E85D2C] shadow-[0_4px_14px_rgba(0,0,0,0.1)]'
                    : cn('bg-white text-[#1C1C1C]', CARD_SHADOW),
                )}
              >
                {svc.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Filter chips */}
      <section className="mt-6 px-5">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1">
          {FILTER_CHIPS.map((chip) => {
            const active = activeCategory === chip.categoryId
            return (
              <button
                key={`${chip.categoryId}-${chip.label}`}
                type="button"
                onClick={() => setActiveCategory(chip.categoryId)}
                className={cn(
                  'shrink-0 rounded-2xl px-6 py-3 text-base font-semibold whitespace-nowrap transition-all',
                  active
                    ? 'border-b-[3px] border-[#FF6B35] bg-white text-[#FF6B35] shadow-[0_4px_14px_rgba(0,0,0,0.08)]'
                    : cn('bg-white text-[#878787]', CARD_SHADOW),
                )}
              >
                {chip.emoji} {chip.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Main scrollable content */}
      <div className="mt-6 space-y-6 pb-6">
        {/* Hero promotional banner */}
        <section ref={heroRef} className="px-5">
          <div className="relative flex h-[190px] items-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF6B35] via-[#FF7043] to-[#FFB74D] px-6 shadow-[0_10px_36px_rgba(255,107,53,0.22)]">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 right-20 h-24 w-24 rounded-full bg-white/10" />
            <div className="relative z-10 max-w-[52%]">
              <p className="text-xs font-bold uppercase tracking-widest text-white/80">
                Limited time offer
              </p>
              <p className="mt-1 text-3xl font-bold leading-tight text-white">
                Deals from ₹9
              </p>
              <p className="mt-2 text-sm leading-snug text-white/90">
                Fresh groceries delivered in 10 minutes
              </p>
              <button
                type="button"
                onClick={scrollToDeals}
                className="mt-4 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#FF6B35] shadow-[0_4px_16px_rgba(0,0,0,0.15)] active:scale-95"
              >
                Shop Now
              </button>
            </div>
            <div className="absolute -right-1 bottom-0 top-0 flex items-center pr-2">
              <div className="grid grid-cols-2 gap-2">
                {heroDisplayImages.map((item, idx) => (
                  <div
                    key={`hero-img-${idx}`}
                    className={cn(
                      'relative overflow-hidden rounded-2xl border-2 border-white/30 bg-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
                      idx % 2 === 0 ? 'rotate-[-2deg]' : 'rotate-[2deg]',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      alt=""
                      className="h-[80px] w-[80px] object-cover"
                    />
                    {item.price != null && (
                      <span className="absolute bottom-0 left-0 right-0 bg-[#0C831F] py-0.5 text-center text-[9px] font-bold text-white">
                        {formatCurrency(item.price)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Shop by Category */}
        {activeCategory === 'all' && (
          <section className="px-5">
            <SectionHeader title="Shop by Category" subtitle="Everything delivered in minutes." />
            <div className="mt-4 grid grid-cols-2 gap-4">
              {SHOP_BY_CATEGORY.map((item) => (
                <CategoryCard key={item.label} {...item} />
              ))}
            </div>
          </section>
        )}

        {/* Trending Products */}
        {trendingProducts.length > 0 && (
          <section className="px-5">
            <SectionHeader title="Trending Products" subtitle="Popular picks near you" />
            <div className="mt-4 flex gap-4 overflow-x-auto scrollbar-hide pb-1">
              {trendingProducts.map((p) => (
                <div key={`trending-${p.id}`} className="w-[152px] shrink-0">
                  <ProductDealCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Flash Sale */}
        <section ref={dealsRef} className="scroll-mt-40 px-5">
          <div className={cn('bg-white p-5', CARD_RADIUS, CARD_SHADOW)}>
            <SectionHeader
              title="Flash Sale"
              subtitle={
                activeCategory === 'all'
                  ? 'Grab them before they are gone'
                  : `${tab?.label} — limited time deals`
              }
            />
            {flashSaleProducts.length === 0 ? (
              <p className="mt-6 text-base text-[#878787]">
                No items available in this category yet.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {flashSaleProducts.map((p) => (
                  <ProductDealCard key={`flash-${p.id}`} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Best Sellers */}
        {bestSellers.length > 0 && (
          <section className="px-5">
            <SectionHeader title="Best Sellers" subtitle="Top rated by customers" />
            <div className="mt-4 flex gap-4 overflow-x-auto scrollbar-hide pb-1">
              {bestSellers.map((p) => (
                <div key={`bestseller-${p.id}`} className="w-[152px] shrink-0">
                  <ProductDealCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Promo banner ad */}
        <section className="px-5">
          <AdBanner placement="HOME_BANNER" className="h-[190px] w-full rounded-3xl" />
        </section>

        {/* Coupons */}
        <section ref={couponsRef} className="scroll-mt-40 px-5">
          <div className={cn('bg-white p-5', CARD_RADIUS, CARD_SHADOW)}>
            <SectionHeader title="Coupons & offers" />
            <div className="mt-4 flex gap-4 overflow-x-auto scrollbar-hide">
              {COUPONS.map((c) => (
                <div
                  key={c.title}
                  className={cn(
                    'min-w-[160px] shrink-0 border-[1.5px] border-[#0C831F] bg-white p-4',
                    CARD_RADIUS,
                    CARD_SHADOW,
                  )}
                >
                  <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#0C831F]">
                    <Percent className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-base font-bold text-[#1C1C1C]">{c.title}</p>
                  <p className="text-xs text-[#878787]">{c.sub}</p>
                  <p className="mt-2 text-[11px] text-[#878787]">{c.cashback}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nearby Shops */}
        <section className="px-5">
          <div className={cn('bg-white p-5', CARD_RADIUS, CARD_SHADOW)}>
            <SectionHeader title="Stores near you" subtitle="Delivering in 15-30 mins" />
            <div className="mt-4 flex gap-4 overflow-x-auto scrollbar-hide">
              {loadingShops ? (
                <>
                  <ShopSkeleton />
                  <ShopSkeleton />
                  <ShopSkeleton />
                </>
              ) : shops.length === 0 ? (
                <p className="text-base text-[#878787]">No stores nearby.</p>
              ) : (
                shops.map((shop) => <HomeShopCard key={shop.id} shop={shop} />)
              )}
            </div>
          </div>
        </section>

        {/* Buy Again */}
        {loggedIn && (
          <section className="px-5">
            <div className={cn('bg-white p-5', CARD_RADIUS, CARD_SHADOW)}>
              <SectionHeader title="Buy Again" />
              <div className="mt-4 flex gap-3">
                {['all', 'kirana', 'fish'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBuyAgainTab(t)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-semibold capitalize',
                      buyAgainTab === t
                        ? 'bg-[#FF3F6C] text-white shadow-[0_4px_16px_rgba(255,63,108,0.3)]'
                        : cn('border border-[#F0F0F0] bg-white text-[#878787]', CARD_SHADOW),
                    )}
                  >
                    {t === 'all' ? 'All Items' : t}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-4 overflow-x-auto scrollbar-hide">
                {deals.slice(0, 6).map((p) => (
                  <Link key={p.id} href={`/shops/${p.shopSlug}`} className="w-[88px] shrink-0">
                    <div className={cn('h-20 w-20 overflow-hidden bg-[#F8F8F8]', CARD_RADIUS, CARD_SHADOW)}>
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
                    <p className="mt-2 line-clamp-2 text-xs font-medium text-[#1C1C1C]">
                      {p.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Offers floating button — only after hero scrolls away */}
      {heroPassed && (
        <button
          type="button"
          onClick={scrollToCoupons}
          className="fixed bottom-[156px] left-1/2 z-40 -translate-x-1/2 rounded-[20px] border border-[#E0E0E0] bg-white px-5 py-2 text-sm font-bold text-[#1C1C1C] shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
        >
          Offers ∧
        </button>
      )}

      <ViewCartBar />

      {/* Free delivery floating card — docked above bottom nav, hidden while hero is visible */}
      {showFreeDeliveryBar && heroPassed && (
        <button
          type="button"
          onClick={scrollToDeals}
          className="fixed bottom-[92px] left-5 right-5 z-40 mx-auto flex h-10 max-w-[440px] items-center justify-between rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8F6B] px-4 shadow-[0_6px_24px_rgba(255,107,53,0.28)]"
        >
          <div className="text-left">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-white">
              <span>🐰</span> Unlock free delivery
            </p>
            <p className="text-[10px] text-white/85">
              Shop for ₹{remainingForFree} more
            </p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <ChevronUp className="h-4 w-4 text-white" />
          </span>
        </button>
      )}
    </div>
  )
}
