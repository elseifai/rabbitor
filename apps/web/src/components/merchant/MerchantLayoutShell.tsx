'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Megaphone,
  Ticket,
  IndianRupee,
  Store,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/auth/LogoutButton'

// MERCHANT SIDEBAR & CATALOG REFACTOR — persistent admin-style sidebar navigation
const NAV: {
  href: string
  label: string
  short: string
  icon: typeof LayoutDashboard
  exact?: boolean
}[] = [
  { href: '/merchant', label: 'Overview', short: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/merchant/orders', label: 'Orders', short: 'Orders', icon: ShoppingBag },
  { href: '/merchant/products', label: 'Product Listing', short: 'Products', icon: Package },
  { href: '/merchant/manage-ads', label: 'Manage Ads', short: 'Ads', icon: Megaphone },
  { href: '/merchant/coupons', label: 'Coupons & Offers', short: 'Deals', icon: Ticket },
  { href: '/merchant/revenue', label: 'Revenue & Payouts', short: 'Revenue', icon: IndianRupee },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MerchantLayoutShell({
  children,
  shopName = 'Your Store',
  shopOpen,
  onToggleShop,
}: {
  children: React.ReactNode
  shopName?: string
  shopOpen?: boolean
  onToggleShop?: () => void
}) {
  const pathname = usePathname()
  const current = NAV.find((n) => isActive(pathname, n.href, n.exact)) ?? NAV[0]

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="hidden w-56 shrink-0 border-r bg-white lg:block">
        <div className="border-b px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35] text-sm font-black text-white">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-gray-900">{shopName}</p>
              <p className="text-[9px] font-bold uppercase text-gray-400">Merchant Portal</p>
            </div>
          </div>
          {onToggleShop && (
            <button
              type="button"
              onClick={onToggleShop}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-600 hover:border-[#FF6B35]/30"
            >
              {shopOpen ? (
                <ToggleRight className="h-4 w-4 text-green-500" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-gray-400" />
              )}
              {shopOpen ? 'Store Open' : 'Store Paused'}
            </button>
          )}
        </div>
        <nav className="space-y-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive(pathname, href, exact)
                  ? 'bg-[#FF6B35]/10 text-[#FF6B35]'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t p-3">
          <Link href="/" className="block rounded-xl px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-[#FF6B35]">
            ← Customer app
          </Link>
          <LogoutButton
            compact
            label="Logout"
            className="w-full rounded-xl px-3 py-2 text-xs font-medium hover:bg-red-50"
          />
        </div>
      </aside>

      <div className="flex flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-4 lg:px-8">
          <div>
            <h1 className="text-lg font-black text-gray-900">{current.label}</h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 lg:hidden">
              {shopName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onToggleShop && (
              <button
                type="button"
                onClick={onToggleShop}
                className="flex items-center gap-1 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase lg:hidden"
              >
                {shopOpen ? (
                  <ToggleRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-gray-400" />
                )}
                {shopOpen ? 'Open' : 'Paused'}
              </button>
            )}
            <LogoutButton compact label="Logout" />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto border-t bg-white lg:hidden">
        {NAV.map(({ href, short, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 py-2 text-[9px] font-bold',
              isActive(pathname, href, exact) ? 'text-[#FF6B35]' : 'text-gray-400',
            )}
          >
            <Icon className="h-4 w-4" />
            {short}
          </Link>
        ))}
      </nav>
    </div>
  )
}
