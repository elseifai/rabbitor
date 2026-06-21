'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BottomNavBrandAd } from '@/components/layout/BottomNavBrandAd'

const HIDDEN_PREFIXES = ['/track', '/checkout', '/merchant', '/admin']

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/shops', label: 'Stores', icon: Store },
] as const

export function BottomNav() {
  const pathname = usePathname()

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#F0F0F0] bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-3">
        {TABS.map((tab) => {
          const { href, label, icon: Icon } = tab
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const color = active ? 'text-[#FF6B35]' : 'text-[#878787]'

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex w-[72px] shrink-0 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold',
                color,
              )}
            >
              <Icon
                className={cn('h-5 w-5', active && href === '/' && 'fill-[#FF6B35]')}
                strokeWidth={active ? 2.5 : 2}
              />
              {label}
            </Link>
          )
        })}

        <BottomNavBrandAd className="mx-1" />
      </div>
    </nav>
  )
}
