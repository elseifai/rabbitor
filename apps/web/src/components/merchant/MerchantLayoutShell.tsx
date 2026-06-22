'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, Warehouse } from 'lucide-react'

const NAV = [
  { href: '/merchant', label: 'Stock', icon: LayoutDashboard },
  { href: '/merchant/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/merchant/products', label: 'Products', icon: Package },
  { href: '/merchant/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/merchant/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/merchant/settings', label: 'Settings', icon: Settings },
]

export function MerchantLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStockHome = pathname === '/merchant'

  if (isStockHome) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-rabbit-600">
              Merchant Dashboard
            </p>
            <h1 className="font-display text-lg font-bold text-gray-900">Shop Owner Portal</h1>
          </div>
          <Link href="/" className="text-sm text-gray-500 hover:text-rabbit-600">
            ← Customer app
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:flex-row sm:px-6">
        <aside className="flex shrink-0 gap-2 overflow-x-auto sm:w-52 sm:flex-col sm:overflow-visible">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white hover:shadow-sm ${
                pathname === href || pathname.startsWith(`${href}/`)
                  ? 'bg-white text-rabbit-700 shadow-sm ring-1 ring-rabbit-100'
                  : 'text-gray-600 hover:text-rabbit-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
