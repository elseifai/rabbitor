'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SubPlatformTabs } from '@/components/navigation/SubPlatformTabs'
import { parseSubPlatformId, type SubPlatformId } from '@/lib/sub-platforms'
import { cn } from '@/lib/utils'

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

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'cloud-kitchen', label: 'Cloud Kitchen' },
  { id: 'cafe', label: 'Cafés' },
  { id: 'restaurant', label: 'Restaurants' },
  { id: 'bakery', label: 'Bakery' },
] as const

function matchesFilter(shop: ApiShop, filter: string): boolean {
  if (filter === 'all') return true
  const hay = `${shop.name} ${shop.category}`.toLowerCase()
  if (filter === 'cloud-kitchen') return hay.includes('cloud') || hay.includes('kitchen')
  if (filter === 'cafe') return hay.includes('cafe') || hay.includes('café')
  if (filter === 'restaurant') return hay.includes('restaurant') || hay.includes('diner')
  if (filter === 'bakery') return shop.storeType === 'BAKERY' || hay.includes('bakery')
  return true
}

function ShopCard({ shop }: { shop: ApiShop }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="overflow-hidden rounded-xl border border-[#F0F0F0] bg-white"
    >
      <div className="relative h-[120px]">
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
      <div className="p-3">
        <p className="truncate text-sm font-bold text-[#1C1C1C]">{shop.name}</p>
        <span className="text-[11px] font-semibold text-[#059669]">{shop.category}</span>
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

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-[#F0F0F0] bg-white">
      <div className="h-[120px] bg-[#F0F0F0]" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 rounded bg-[#F0F0F0]" />
        <div className="h-2 w-1/2 rounded bg-[#F0F0F0]" />
      </div>
    </div>
  )
}

export function RestaurantsListing() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState('all')
  const [shops, setShops] = useState<ApiShop[]>([])
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

  const handleSubPlatformChange = useCallback(
    (next: SubPlatformId) => {
      if (next === 'restaurants') return
      if (next === 'all') router.push('/')
      else router.push(`/?platform=${next}`)
    },
    [router],
  )

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#F0F0F0] font-sans shadow-xl">
      <div className="sticky top-0 z-50 border-b border-[#F0F0F0] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm font-bold text-[#059669]">
            ← Home
          </Link>
          <div className="flex-1 text-center">
            <p className="text-sm font-black text-[#1C1C1C]">Restaurants & Cafés</p>
            <p className="text-[10px] text-[#878787]">Cloud kitchens · cafés · dining</p>
          </div>
          <div className="w-12" />
        </div>
        <SubPlatformTabs
          activeTab={parseSubPlatformId('restaurants')}
          onChange={handleSubPlatformChange}
          className="px-0 pb-0 pt-2"
        />
      </div>

      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap',
                activeFilter === tab.id
                  ? 'border-[#059669] bg-[#059669] text-white'
                  : 'border-[#F0F0F0] bg-white text-[#878787]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-[#878787]">
          {loading ? 'Finding places near you…' : `${filtered.length} places delivering`}
        </p>

        {loading ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-[#E0E0E0] bg-white py-16 text-center">
            <p className="text-[#878787]">No restaurants found in this filter</p>
            <Link href="/" className="mt-2 inline-block text-sm font-semibold text-[#059669]">
              Browse all stores
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {filtered.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
