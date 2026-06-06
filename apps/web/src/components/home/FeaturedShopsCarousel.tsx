'use client'

import Link from 'next/link'
import { Star, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { FEATURED_SHOPS } from '@/lib/constants'
import { cn } from '@/lib/utils'

function ShopImage({ src, alt }: { src: string; alt: string }) {
  return (
    // Native img avoids Next.js Image SVG/404 errors blocking the homepage
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
            <p className="mt-1 text-sm text-gray-500">
              Open now near your location
            </p>
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

        <div
          ref={scrollRef}
          className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        >
          {FEATURED_SHOPS.map((shop) => (
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
                <h3 className="mt-0.5 font-semibold text-gray-900 line-clamp-1">
                  {shop.name}
                </h3>
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
      </div>
    </section>
  )
}
