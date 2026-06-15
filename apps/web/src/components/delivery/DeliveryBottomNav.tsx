'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Package, Navigation, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/delivery/dashboard', icon: Package, label: 'Jobs' },
  { href: '/delivery/orders', icon: MapPin, label: 'Active' },
  { href: '/delivery/navigate', icon: Navigation, label: 'Navigate' },
  { href: '/delivery/earnings', icon: Wallet, label: 'Earnings' },
] as const

export function DeliveryBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-orange-100 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg justify-around py-2">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-w-[4.5rem] flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-bold transition',
                active ? 'text-orange-500' : 'text-gray-400',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
