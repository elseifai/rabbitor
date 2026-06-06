'use client'

import Link from 'next/link'
import { Clock, MapPin } from 'lucide-react'
import type { ShopListItem } from '@/actions/shops'
import { cn, formatCurrency } from '@/lib/utils'

export function ShopCard({ shop }: { shop: ShopListItem }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-card transition hover:border-rabbit-300 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                shop.isActive ? 'bg-rabbit-100 text-rabbit-700' : 'bg-gray-100 text-gray-500',
              )}
            >
              {shop.isActive ? 'Open' : 'Closed'}
            </span>
            <span className="text-xs text-gray-400">{shop.category}</span>
          </div>
          <h3 className="mt-1 font-semibold text-gray-900 truncate">{shop.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-rabbit-600" />
              {shop.etaMinutes} min
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {shop.distanceKm} km
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500">Delivery</p>
          <p className="font-semibold text-gray-900">
            {shop.deliveryFee === 0 ? 'Free' : formatCurrency(shop.deliveryFee)}
          </p>
          <p className="mt-1 text-[10px] text-gray-400">Min {formatCurrency(shop.minOrderValue)}</p>
        </div>
      </div>
    </Link>
  )
}
