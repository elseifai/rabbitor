import { LogoutButton } from '@/components/auth/LogoutButton'

export default function DeliveryAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/80 to-white">
      <header className="flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-orange-500">Rabbitor</p>
          <p className="text-sm font-semibold text-gray-700">Delivery partner</p>
        </div>
        <LogoutButton compact label="Logout" />
      </header>
      <main className="px-4 pb-8">{children}</main>
    </div>
  )
}
