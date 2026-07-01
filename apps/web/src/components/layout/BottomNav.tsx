'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Store, ShoppingBag, ClipboardList, User } from 'lucide-react'
import { useCartStore } from '@/store'
import { cn } from '@/lib/utils'

const HIDDEN_PREFIXES = ['/track', '/checkout', '/merchant', '/admin']

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/shops', label: 'Shops', icon: Store },
  { href: '/cart', label: 'Cart', icon: ShoppingBag, badge: true },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/profile', label: 'Profile', icon: User },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const itemCount = useCartStore((s) => s.itemCount())

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 px-5 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-[72px] max-w-[440px] items-center justify-around rounded-[24px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        {TABS.map((tab) => {
          const { href, label, icon: Icon } = tab
          const showBadge = 'badge' in tab && tab.badge
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const color = active ? 'text-[#FF6B35]' : 'text-[#878787]'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold',
                color,
              )}
            >
              <span className="relative">
                <Icon
                  className={cn('h-6 w-6', active && href === '/' && 'fill-[#FF6B35]')}
                  strokeWidth={active ? 2.5 : 2}
                />
                {showBadge && itemCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B35] px-1 text-[9px] font-bold text-white">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
