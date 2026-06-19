'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type RestaurantShop = {
  id: string
  slug: string
  name: string
  category: string
  storeType: string
  image: string | null
  deliveryFee: number
  etaMinutes: number
  time?: string
  rating: string
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'cloud-kitchen', label: 'Cloud Kitchen' },
  { id: 'cafe', label: 'Cafés' },
  { id: 'restaurant', label: 'Restaurants' },
  { id: 'bakery', label: 'Bakery' },
] as const

function matchesFilter(shop: RestaurantShop, filter: string): boolean {
  if (filter === 'all') return true
  const hay = `${shop.name} ${shop.category}`.toLowerCase()
  if (filter === 'cloud-kitchen') return hay.includes('cloud') || hay.includes('kitchen')
  if (filter === 'cafe') return hay.includes('cafe') || hay.includes('café')
  if (filter === 'restaurant') return hay.includes('restaurant') || hay.includes('diner')
  if (filter === 'bakery') return shop.storeType === 'BAKERY' || hay.includes('bakery')
  return true
}

function RestaurantCard({ shop }: { shop: RestaurantShop }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="overflow-hidden rounded-xl border border-[#F0F0F0] bg-white"
    >
      <div className="relative h-[110px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            shop.image ??
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80'
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
        <span className="text-[11px] font-semibold text-[#059669]">{shop.category}</span>
        <p className="mt-1 text-[11px] text-[#878787]">
          ⭐ {shop.rating} · {shop.time ?? `${shop.etaMinutes} mins`}
        </p>
      </div>
    </Link>
  )
}

export function RestaurantsHomeSection() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [shops, setShops] = useState<RestaurantShop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/shops?vertical=restaurants')
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

  const filtered = useMemo(
    () => shops.filter((s) => matchesFilter(s, activeFilter)),
    [shops, activeFilter],
  )

  return (
    <section className="mb-2 bg-white p-4">
      <h2 className="text-lg font-bold text-[#1C1C1C]">Restaurants / Cafés</h2>
      <p className="text-xs text-[#878787]">
        Cloud kitchens · cafés · dining near you
      </p>

      <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap',
              activeFilter === tab.id
                ? 'border-[#059669] bg-[#059669] text-white'
                : 'border-[#F0F0F0] bg-[#F8F8F8] text-[#878787]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-[#F0F0F0]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-center text-sm text-[#878787]">No restaurants found nearby yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {filtered.map((shop) => (
            <RestaurantCard key={shop.id} shop={shop} />
          ))}
        </div>
      )}

      <Link
        href="/restaurants"
        className="mt-4 block text-center text-xs font-bold text-[#059669]"
      >
        View all restaurants →
      </Link>
    </section>
  )
}
