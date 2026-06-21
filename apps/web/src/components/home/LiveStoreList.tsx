'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Star, Percent, Clock, WifiOff } from 'lucide-react'

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
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    fetch('/api/shops')
      .then((res) => res.json())
      .then((json: { success: boolean; data?: ApiShop[] }) => {
        if (json.success && json.data && json.data.length > 0) {
          setStores(json.data)
          setLive(true)
        } else {
          setStores([])
        }
      })
      .catch(() => {
        setFetchError(true)
        setStores([])
      })
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

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 py-10 text-center">
        <WifiOff className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-2 text-sm font-semibold text-red-700">Could not load stores</p>
        <p className="text-xs text-red-500">Please check your connection and refresh.</p>
      </div>
    )
  }

  if (visibleStores.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-100 bg-white py-10 text-center text-sm font-medium text-slate-400">
        {stores.length === 0
          ? 'No stores available in your area yet.'
          : 'No stores match your search or filters.'}
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
