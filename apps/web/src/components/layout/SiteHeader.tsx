'use client'

import Link from 'next/link'
import { Rabbit, ShoppingBag, MapPin, Menu, ClipboardList } from 'lucide-react'
import { useLocationStore, useCartStore } from '@/store'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

export function SiteHeader() {
  const formattedAddress = useLocationStore((s) => s.formattedAddress)
  const itemCount = useCartStore((s) => s.itemCount())
  const { isLoggedIn: loggedIn } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rabbit-600 text-white">
            <Rabbit className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-gray-900">
            Rabbit
          </span>
        </Link>

        <button
          type="button"
          className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-left text-sm transition hover:border-rabbit-300 sm:flex max-w-md"
          onClick={() => document.getElementById('location-picker')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <MapPin className="h-4 w-4 shrink-0 text-rabbit-600" />
          <span className="truncate text-gray-600">
            {formattedAddress ?? 'Set delivery location'}
          </span>
        </button>

        <nav className="flex items-center gap-1 sm:gap-2">
          {loggedIn && (
            <Link
              href="/orders"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 md:inline-flex"
            >
              <ClipboardList className="h-4 w-4" />
              My Orders
            </Link>
          )}
          <Link
            href="/merchant"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 md:inline-block"
          >
            For Shops
          </Link>
          <Link
            href="/delivery"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 md:inline-block"
          >
            Deliver
          </Link>
          <Link
            href="/cart"
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition hover:border-rabbit-300 hover:text-rabbit-700',
            )}
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rabbit-600 px-1 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700 sm:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </div>
    </header>
  )
}
