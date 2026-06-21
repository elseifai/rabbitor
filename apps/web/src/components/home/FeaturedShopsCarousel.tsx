'use client'

import Link from 'next/link'
import { ArrowRight, Star, Clock, MapPin, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type FeaturedShop = {
  id: string
  slug: string
  name: string
  type: string
  rating: number
  deliveryMins: number
  distance: string
  image: string
  tags: string[]
  isActive: boolean
}

function ShopImage({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
      loading="lazy"
      decoding="async"
    />
  )
}

export function FeaturedShopsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [shops, setShops] = useState<FeaturedShop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shops')
      .then((r) => r.json())
      .then((json) => {
        if (!json.success || !Array.isArray(json.data)) return
        setShops(
          json.data.slice(0, 8).map(
            (s: {
              id: string
              slug: string
              name: string
              category: string
              ratingAvg?: number
              etaMinutes?: number
              image?: string
            }) => ({
              id: s.id,
              slug: s.slug,
              name: s.name,
              type: s.category ?? 'Local Shop',
              rating: s.ratingAvg ?? 4.2,
              deliveryMins: s.etaMinutes ?? 20,
              distance: 'Nearby',
              image:
                s.image ??
                'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=300&fit=crop&auto=format&fm=jpg',
              tags: [s.category ?? 'Local'],
              isActive: true,
            }),
          ),
        )
      })
      .catch(() => setShops([]))
      .finally(() => setLoading(false))
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.85
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="border-t border-gray-100 bg-gray-50/50 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              Featured local shops
            </h2>
            <p className="mt-1 text-sm text-gray-500">Open now near your location</p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-rabbit-300"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-rabbit-300"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-rabbit-500" />
          </div>
        ) : shops.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-gray-100 bg-white py-12 text-center text-sm text-gray-500">
            No featured shops available yet.
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
          >
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/shops/${shop.slug}`}
                className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card transition hover:shadow-card-hover sm:w-[300px]"
              >
                <div className="relative h-36 overflow-hidden bg-gray-100">
                  <ShopImage src={shop.image} alt={shop.name} />
                  <span
                    className={cn(
                      'absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold',
                      shop.isActive
                        ? 'bg-rabbit-600 text-white'
                        : 'bg-gray-800/80 text-white',
                    )}
                  >
                    {shop.isActive ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium text-rabbit-600">{shop.type}</p>
                  <h3 className="mt-0.5 line-clamp-1 font-semibold text-gray-900">{shop.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {shop.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {shop.deliveryMins} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {shop.distance}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {shop.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/shops"
          className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-rabbit-600 hover:text-rabbit-700 sm:hidden"
        >
          View all shops
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
