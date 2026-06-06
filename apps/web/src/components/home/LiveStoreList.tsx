'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Star, Percent, Clock } from 'lucide-react'

type ApiShop = {
  id: string
  slug: string
  name: string
  rating: string
  time: string
  cuisine: string
  location: string
  image: string
}

type SortOption = 'default' | 'rating' | 'time' | 'name'

type Props = {
  searchQuery?: string
  sortBy?: SortOption
  fastDeliveryOnly?: boolean
  minRating?: number
}

const FALLBACK_DISCOUNTS = [
  '50% OFF up to ₹100',
  '₹125 OFF on Premium Packs',
  'Free Rabbit Delivery',
]

const STATIC_FALLBACK: ApiShop[] = [
  {
    id: 'shop-1',
    slug: 'royal-coastal-seafood',
    name: 'Royal Coastal Seafood Stall',
    rating: '4.4',
    time: '20-25 mins',
    cuisine: 'Sea Fish, Cleaned Shrimp, Pomfret',
    location: 'Crawford Market Area',
    image:
      'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'shop-2',
    slug: 'sharma-kirana',
    name: 'Balaji Super Kirana Hub',
    rating: '4.1',
    time: '10-15 mins',
    cuisine: 'Atta, Dals, Spices, Household Essentials',
    location: 'Sector 4 Arcade',
    image:
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'shop-3',
    slug: 'walkwell-footwear',
    name: 'Metro Steps Footwear',
    rating: '4.5',
    time: '30-35 mins',
    cuisine: 'Daily Slippers, Sandals, Local Crafts',
    location: 'Colaba Runway Store',
    image:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80',
  },
]

function parseEtaMinutes(time: string): number {
  const match = time.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 99
}

function filterStores(stores: ApiShop[], props: Props): ApiShop[] {
  let result = [...stores]
  const q = props.searchQuery?.trim().toLowerCase()

  if (q) {
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.cuisine.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q),
    )
  }

  if (props.fastDeliveryOnly) {
    result = result.filter((s) => parseEtaMinutes(s.time) <= 20)
  }

  if (props.minRating) {
    result = result.filter((s) => parseFloat(s.rating) >= props.minRating!)
  }

  switch (props.sortBy) {
    case 'rating':
      result.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      break
    case 'time':
      result.sort((a, b) => parseEtaMinutes(a.time) - parseEtaMinutes(b.time))
      break
    case 'name':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
    default:
      break
  }

  return result
}

export function LiveStoreList({
  searchQuery = '',
  sortBy = 'default',
  fastDeliveryOnly = false,
  minRating,
}: Props) {
  const [stores, setStores] = useState<ApiShop[]>([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)

  useEffect(() => {
    fetch('/api/shops')
      .then((res) => res.json())
      .then((json: { success: boolean; data?: ApiShop[] }) => {
        if (json.success && json.data && json.data.length > 0) {
          setStores(json.data)
          setLive(true)
        } else {
          setStores(STATIC_FALLBACK)
        }
      })
      .catch(() => setStores(STATIC_FALLBACK))
      .finally(() => setLoading(false))
  }, [])

  const visibleStores = useMemo(
    () => filterStores(stores, { searchQuery, sortBy, fastDeliveryOnly, minRating }),
    [stores, searchQuery, sortBy, fastDeliveryOnly, minRating],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex animate-pulse gap-4 rounded-2xl bg-white p-2">
            <div className="h-36 w-32 shrink-0 rounded-2xl bg-slate-100" />
            <div className="flex-1 space-y-2 pt-2">
              <div className="h-4 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
              <div className="h-3 w-full rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (visibleStores.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-100 bg-white py-10 text-center text-sm font-medium text-slate-400">
        No stores match your search or filters.
      </p>
    )
  }

  return (
    <>
      {live && (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#FF6B35]">
          ● Live from database
        </p>
      )}
      <div className="space-y-6">
        {visibleStores.map((store, index) => {
          const discount = FALLBACK_DISCOUNTS[index % FALLBACK_DISCOUNTS.length]

          return (
            <Link
              key={store.id}
              href={`/shops/${store.slug}`}
              className="group flex cursor-pointer items-start gap-4 rounded-2xl bg-white p-2 transition duration-300 hover:bg-[#FFF8F5]/30"
            >
              <div className="relative h-36 w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={store.image}
                  alt={store.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-[11px] font-black tracking-tight text-white">
                  <Percent className="h-3 w-3 fill-[#FF6B35] text-[#FF6B35]" /> {discount}
                </div>
              </div>

              <div className="flex-1 space-y-1.5 pt-1">
                <h4 className="text-base font-black leading-tight tracking-tight text-slate-900 transition group-hover:text-[#FF6B35]">
                  {store.name}
                </h4>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <div className="flex origin-left scale-95 items-center gap-0.5 rounded-md bg-green-600 px-1.5 py-0.5 text-white">
                    <Star className="h-3 w-3 fill-current stroke-current" />
                    <span>{store.rating}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1 text-slate-700">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{store.time}</span>
                  </div>
                </div>

                <p className="line-clamp-1 text-xs font-medium text-slate-400">{store.cuisine}</p>
                <p className="text-xs font-semibold tracking-tight text-slate-400">{store.location}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
