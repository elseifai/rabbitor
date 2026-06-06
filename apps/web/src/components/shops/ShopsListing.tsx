'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { getNearbyShops, type ShopListItem } from '@/actions/shops'
import { useLocationStore } from '@/store'
import { ShopFilters } from './ShopFilters'
import { ShopCard } from './ShopCard'
import { SAVED_LOCATIONS } from '@/lib/constants'
import { getFallbackShops } from '@/lib/fallback-shops'

export function ShopsListing() {
  const params = useSearchParams()
  const location = useLocationStore((s) => s.location)

  const categorySlug = params.get('category') ?? undefined
  const sortBy = (params.get('sort') as 'distance' | 'eta' | 'rating') ?? 'distance'
  const openOnly = params.get('open') !== 'false'

  const lat = location?.latitude ?? SAVED_LOCATIONS[0].latitude
  const lng = location?.longitude ?? SAVED_LOCATIONS[0].longitude

  const [shops, setShops] = useState<ShopListItem[]>(() =>
    getFallbackShops({ categorySlug, openOnly }),
  )

  useEffect(() => {
    let cancelled = false

    getNearbyShops({
      lat,
      lng,
      radiusKm: 5,
      categorySlug,
      openOnly,
      sortBy,
    })
      .then((result) => {
        if (!cancelled && result.length > 0) setShops(result)
      })
      .catch(() => {
        /* keep fallback list */
      })

    return () => {
      cancelled = true
    }
  }, [lat, lng, categorySlug, sortBy, openOnly])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
          Shops near you
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin className="h-4 w-4 text-rabbit-600" />
          {location?.area ?? 'Andheri West, Mumbai'} · within 5 km
        </p>
      </div>

      <ShopFilters />

      {shops.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-600">No shops found in your area.</p>
          <Link href="/" className="mt-2 inline-block text-sm text-rabbit-600">
            Update location
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  )
}
