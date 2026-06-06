'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin,
  Search,
  ChevronDown,
  SlidersHorizontal,
  User,
} from 'lucide-react'
import { LiveStoreList } from '@/components/home/LiveStoreList'

const WHATS_ON_YOUR_MIND = [
  { name: 'Fresh Fish', emoji: '🐟', bg: 'bg-[#FFF0EA]', href: '/shops/masoli-house' },
  { name: 'Cloud Kitchen', emoji: '🍔', bg: 'bg-[#FFF5E5]', href: '/shops/99-corner-cloud-kitchen' },
  { name: 'Daily Kirana', emoji: '🌾', bg: 'bg-[#FFF5E5]', href: '/shops/sharma-kirana' },
  { name: 'Veggies', emoji: '🥦', bg: 'bg-[#E6F7ED]', href: '/shops?category=vegetables' },
  { name: 'Footwear', emoji: '👟', bg: 'bg-[#FFF0EA]', href: '/shops/walkwell-footwear' },
  { name: 'Meat Cut', emoji: '🥩', bg: 'bg-[#FFF5E5]', href: '/shops?category=groceries' },
  { name: 'Dairy Egg', emoji: '🥚', bg: 'bg-[#E6F7ED]', href: '/shops?category=groceries' },
]

const PROMO_OFFERS = [
  {
    title: 'Flat 50% OFF',
    desc: 'On first seafood order',
    code: 'WELCOME50',
    gradient: 'from-[#FF6B35] to-[#FF8C61]',
  },
  {
    title: 'Free Delivery',
    desc: 'From local kirana marts',
    code: 'RABBITFAST',
    gradient: 'from-slate-900 to-slate-800',
  },
  {
    title: 'Buy 1 Get 1',
    desc: 'On organic local greens',
    code: 'FRESHBOGO',
    gradient: 'from-[#E04E1B] to-[#FF6B35]',
  },
]

type SortOption = 'default' | 'rating' | 'time' | 'name'

export function HomeFeed() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false)
  const [minRating, setMinRating] = useState<number | undefined>(undefined)
  const cycleSort = () => {
    const order: SortOption[] = ['default', 'rating', 'time', 'name']
    const idx = order.indexOf(sortBy)
    setSortBy(order[(idx + 1) % order.length])
  }

  const sortLabel =
    sortBy === 'rating'
      ? 'Top Rated'
      : sortBy === 'time'
        ? 'Fastest'
        : sortBy === 'name'
          ? 'A–Z'
          : 'Sort By'

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-white pb-24 font-sans text-slate-900 antialiased shadow-2xl shadow-slate-200">
      <div className="sticky top-0 z-50 border-b border-slate-100 bg-white px-5 pb-3 pt-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between">
          <button type="button" className="group flex cursor-pointer items-center gap-2">
            <MapPin className="h-6 w-6 animate-[pulse_2s_infinite] text-[#FF6B35]" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-sm font-black tracking-tight text-slate-950 transition group-hover:text-[#FF6B35]">
                  Home
                </span>
                <ChevronDown className="h-4 w-4 text-[#FF6B35] transition-transform group-hover:translate-y-0.5" />
              </div>
              <span className="max-w-[220px] truncate text-xs font-medium text-slate-500">
                Royal Heights, Sector 4, Mumbai, MH
              </span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-[#FF6B35]/20 bg-[#FFF8F5] px-2 py-1 text-xs font-black uppercase tracking-wider text-[#FF6B35]">
              🐇 Rabbit
            </span>
            <Link
              href="/auth"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"
            >
              <User className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative mt-4">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groceries, fish, kirana or footwear..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-sm font-medium shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-[#FF6B35] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] focus:outline-none"
          />
          <div className="absolute right-3 top-2.5 flex h-8 w-8 items-center justify-center text-slate-400">
            <Search className="h-4 w-4 text-[#FF6B35]" />
          </div>
        </div>
      </div>

      <div className="space-y-8 p-5">
        <div className="scrollbar-hide flex snap-x gap-4 overflow-x-auto pb-2">
          {PROMO_OFFERS.map((offer) => (
            <div
              key={offer.code}
              className={`group relative w-72 shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-r ${offer.gradient} p-4 text-white shadow-md`}
            >
              <div className="relative z-10 space-y-1">
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  Promo Deal
                </span>
                <h3 className="text-lg font-black tracking-tight">{offer.title}</h3>
                <p className="text-xs font-medium text-white/80">{offer.desc}</p>
                <p className="mt-2 inline-block rounded border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest">
                  Code: {offer.code}
                </p>
              </div>
              <div className="absolute -bottom-4 -right-4 rotate-12 select-none text-7xl opacity-15 transition duration-300 group-hover:scale-110">
                🐇
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight text-slate-900">
              What&apos;s on your mind?
            </h3>
            <Link
              href="/shops"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500"
            >
              →
            </Link>
          </div>

          <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
            {WHATS_ON_YOUR_MIND.map((mind) => (
              <Link
                key={mind.name}
                href={mind.href}
                className="group flex shrink-0 cursor-pointer flex-col items-center space-y-2"
              >
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full border border-transparent ${mind.bg} text-4xl shadow-sm transition duration-300 group-hover:border-[#FF6B35]/20 group-hover:shadow-md`}
                >
                  {mind.emoji}
                </div>
                <span className="text-xs font-extrabold tracking-tight text-slate-700 transition group-hover:text-[#FF6B35]">
                  {mind.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="space-y-6">
          <h3 className="text-lg font-black tracking-tight text-slate-900">
            Stores with instant delivery
          </h3>

          <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setFastDeliveryOnly(false)
                setMinRating(undefined)
                setSortBy('default')
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                !fastDeliveryOnly && !minRating && sortBy === 'default'
                  ? 'border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35]'
                  : 'border-slate-200 bg-white hover:border-[#FF6B35]'
              }`}
            >
              Filter <SlidersHorizontal className="h-3 w-3 text-slate-500" />
            </button>
            <button
              type="button"
              onClick={cycleSort}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                sortBy !== 'default'
                  ? 'border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#FF6B35]'
              }`}
            >
              {sortLabel}
            </button>
            <button
              type="button"
              onClick={() => setFastDeliveryOnly((v) => !v)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                fastDeliveryOnly
                  ? 'border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#FF6B35]'
              }`}
            >
              Fast Delivery
            </button>
            <button
              type="button"
              onClick={() => setMinRating((v) => (v ? undefined : 4))}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                minRating
                  ? 'border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#FF6B35]'
              }`}
            >
              Ratings 4.0+
            </button>
          </div>

          <LiveStoreList
            searchQuery={searchQuery}
            sortBy={sortBy}
            fastDeliveryOnly={fastDeliveryOnly}
            minRating={minRating}
          />
        </div>
      </div>
    </div>
  )
}
