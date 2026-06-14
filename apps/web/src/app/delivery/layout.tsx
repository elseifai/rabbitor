import Link from 'next/link'
import { MapPin, Package, Navigation, Wallet } from 'lucide-react'
import { RoleGate } from '@/components/auth/RoleGate'

// PLATFORM CORE RESOLUTION — white & orange Rabbitor delivery theme
export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGate role="RABBITOR" redirectTo="/auth?role=rabbitor">
      <div className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-orange-100 bg-white">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-orange-500">
                Rabbitor
              </p>
              <h1 className="font-display text-lg font-bold text-gray-900">Delivery Partner</h1>
            </div>
            <Link href="/" className="text-sm text-gray-500 hover:text-orange-500">
              Exit
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-lg px-4 py-6">{children}</div>
        <nav className="fixed bottom-0 left-0 right-0 border-t border-orange-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg justify-around py-3">
            {[
              { href: '/delivery', icon: Package, label: 'Jobs' },
              { href: '/delivery/orders', icon: MapPin, label: 'Active' },
              { href: '/delivery/navigate', icon: Navigation, label: 'Navigate' },
              { href: '/delivery/earnings', icon: Wallet, label: 'Earnings' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 text-xs text-gray-500 hover:text-orange-500"
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </RoleGate>
  )
}
