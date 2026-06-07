'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ChevronUp, Minus, Plus, Percent } from 'lucide-react'
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

const ROTATING_PROMOS = [
  { text: '🍦 ICE CREAM CARNIVAL', emoji: '🍦' },
  { text: '🐰 RABBIT FAST DEALS', emoji: '🐰' },
  { text: '🐟 FRESH FISH TODAY', emoji: '🐟' },
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

function ProductDealCard({ product }: { product: DealProduct }) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id))
  const original = Math.round(product.price * 1.35)
  const discount = Math.round(((original - product.price) / original) * 100)
  const outOfStock = product.stock === 0
  const placeholder = STORE_PLACEHOLDERS[product.storeType ?? ''] ?? { emoji: '📦', bg: 'bg-gray-100' }

  return (
    <div className="relative rounded-xl border border-[#F0F0F0] bg-white p-2">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-[#F8F8F8]">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center text-4xl', placeholder.bg)}>
            {placeholder.emoji}
          </div>
        )}
        {!outOfStock && (
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

      <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[#1C1C1C]">
        {product.name}
      </p>
      <p className="text-[11px] text-[#878787]">{product.unit}</p>

      <div className="mt-2 flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-[#1C1C1C]">{formatCurrency(product.price)}</span>
          <span className="text-xs text-[#878787] line-through">{formatCurrency(original)}</span>
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
  const location = useLocationStore((s) => s.location)
  const cartTotal = useCartStore((s) => s.total())

  const [activeCategory, setActiveCategory] = useState('all')
  const [promoIdx, setPromoIdx] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [shops, setShops] = useState<ShopListItem[]>([])
  const [deals, setDeals] = useState<DealProduct[]>([])
  const [loadingShops, setLoadingShops] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [buyAgainTab, setBuyAgainTab] = useState('all')

  const dealsRef = useRef<HTMLDivElement>(null)
  const couponsRef = useRef<HTMLDivElement>(null)

  const lat = location?.latitude ?? SAVED_LOCATIONS[0].latitude
  const lng = location?.longitude ?? SAVED_LOCATIONS[0].longitude

  const tab = HOME_CATEGORY_TABS.find((t) => t.id === activeCategory)
  const storeType = tab?.storeType

  useEffect(() => {
    const t = setInterval(() => setPromoIdx((i) => (i + 1) % ROTATING_PROMOS.length), 3000)
    return () => clearInterval(t)
  }, [])

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
    fetch('/api/shops')
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
              image: p.image ?? null,
              shopId: shop.id,
              shopName: shop.name,
              shopSlug: shop.slug,
              storeType: shop.storeType,
              stock: p.stock,
            })
          }
        }
        setDeals(shuffle(all).slice(0, 8))
      })
      .catch(() => {})
  }, [])

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

  return (
    <div className="mx-auto min-h-screen max-w-[480px] scroll-smooth bg-[#F0F0F0] font-sans shadow-xl">
      {/* SECTION A: Top search bar */}
      <div className="sticky top-0 z-50 border-b border-[#F0F0F0] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative w-[60%]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#878787]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search "atta", "fish", "vegetables"...'
              className="h-10 w-full rounded-lg bg-[#F0F0F0] pl-9 pr-3 text-[13px] text-[#1C1C1C] outline-none placeholder:text-[#878787]"
            />
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#F0F0F0] bg-white shadow-lg">
                {searchResults.map((s) => (
                  <Link
                    key={s.id}
                    href={`/shops/${s.slug}`}
                    className="block border-b border-[#F0F0F0] px-3 py-2.5 text-sm last:border-0 hover:bg-[#F8F8F8]"
                    onClick={() => setSearchQuery('')}
                  >
                    <span className="font-semibold text-[#1C1C1C]">{s.name}</span>
                    <span className="ml-2 text-xs text-[#878787]">{s.category}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex w-[40%] items-center justify-between rounded-lg bg-[#FFF3E0] px-2 py-1 h-10">
            <p
              key={promoIdx}
              className="animate-in fade-in text-[11px] font-bold uppercase leading-tight text-[#D4380D] duration-500"
            >
              {ROTATING_PROMOS[promoIdx].text}
            </p>
            <span className="text-lg">{ROTATING_PROMOS[promoIdx].emoji}</span>
          </div>
        </div>
      </div>

      {/* SECTION B: Category tabs */}
      <div className="sticky top-[64px] z-40 border-b border-[#F0F0F0] bg-white">
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
        {/* Grocery & Kitchen */}
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

        {/* Snacks & Drinks */}
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
          <h2 className="text-lg font-bold text-[#1C1C1C]">Flash Deals: All Time Low</h2>
          <p className="text-xs text-[#878787]">Fresh Essentials Every Day</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {deals.map((p) => (
              <ProductDealCard key={p.id} product={p} />
            ))}
          </div>
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
          <p className="text-xs text-[#878787]">Delivering in 15-30 mins</p>
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
