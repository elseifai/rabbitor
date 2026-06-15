import Link from 'next/link'
import { DeliveryBottomNav } from '@/components/delivery/DeliveryBottomNav'
import { DeliveryPortalGuard } from '@/components/delivery/DeliveryPortalGuard'
import { LogoutButton } from '@/components/auth/LogoutButton'

export default function DeliveryPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DeliveryPortalGuard>
      <div className="min-h-screen bg-[#F8FAFC] text-gray-900">
        <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-orange-500">Rabbitor Partner</p>
              <h1 className="font-display text-lg font-black text-gray-900">Delivery console</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="hidden text-xs font-semibold text-gray-500 hover:text-orange-500 sm:inline">
                Customer
              </Link>
              <LogoutButton compact label="Logout" />
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-lg px-4 py-4 pb-28">{children}</div>
        <DeliveryBottomNav />
      </div>
    </DeliveryPortalGuard>
  )
}
