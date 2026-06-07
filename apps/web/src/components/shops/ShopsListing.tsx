'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store'
import { HOME_CATEGORY_TABS } from '@/lib/categories'
import { cn, formatCurrency } from '@/lib/utils'

type ApiShop = {
  id: string
  slug: string
  name: string
  category: string
  storeType: string
  image: string | null
  deliveryFee: number
  etaMinutes: number
  time: string
  rating: string
}

function ShopGridCard({ shop }: { shop: ApiShop }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="overflow-hidden rounded-xl border border-[#F0F0F0] bg-white"
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
        <span className="absolute left-2 top-2 rounded bg-[#0C831F] px-1.5 py-0.5 text-[10px] font-bold text-white">
          OPEN
        </span>
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-bold text-[#1C1C1C]">{shop.name}</p>
        <span className="text-[11px] font-semibold text-[#FF6B35]">{shop.category}</span>
        <p className="mt-1 text-[11px] text-[#878787]">
          ⭐ {shop.rating} · {shop.time ?? `${shop.etaMinutes} mins`}
        </p>
        <p className="text-[11px] text-[#878787]">
          {shop.deliveryFee === 0 ? 'FREE delivery' : `₹${shop.deliveryFee} delivery`}
        </p>
      </div>
    </Link>
  )
}

function ShopSkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-[#F0F0F0] bg-white">
      <div className="h-[100px] bg-[#F0F0F0]" />
      <div className="space-y-2 p-2.5">
        <div className="h-3 w-3/4 rounded bg-[#F0F0F0]" />
        <div className="h-2 w-1/2 rounded bg-[#F0F0F0]" />
      </div>
    </div>
  )
}

export function ShopsListing() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [shops, setShops] = useState<ApiShop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/shops')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) setShops(json.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setShops([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return shops
    const tab = HOME_CATEGORY_TABS.find((t) => t.id === activeCategory)
    if (!tab?.storeType) return shops
    return shops.filter((s) => s.storeType === tab.storeType)
  }, [shops, activeCategory])

  return (
    <div className="mx-auto max-w-[480px] px-4 py-4">
      <h1 className="text-lg font-bold text-[#1C1C1C]">Shops near you</h1>
      <p className="text-xs text-[#878787]">
        {loading ? 'Loading…' : `${filtered.length} shops found`}
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {HOME_CATEGORY_TABS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap',
              activeCategory === cat.id
                ? 'border-[#FF6B35] bg-[#FF6B35] text-white'
                : 'border-[#F0F0F0] bg-white text-[#878787]',
            )}
          >
            {cat.label.split(' ')[0]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <ShopSkeletonCard />
          <ShopSkeletonCard />
          <ShopSkeletonCard />
          <ShopSkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-[#F0F0F0] py-16 text-center">
          <p className="text-[#878787]">No shops found in this category</p>
          <Link href="/" className="mt-2 inline-block text-sm text-[#FF6B35]">
            Back to home
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {filtered.map((shop) => (
            <ShopGridCard key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  )
}
