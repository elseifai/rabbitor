import Link from 'next/link'
import { Rabbit } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rabbit-600 text-white">
                <Rabbit className="h-4 w-4" />
              </span>
              <span className="font-display text-lg font-bold">Rabbit</span>
            </div>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Hyperlocal delivery from your neighbourhood kiranas, fish markets,
              and local shops. 0% commission for merchants at launch.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Customers</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/" className="hover:text-rabbit-600">Browse shops</Link></li>
              <li><Link href="/orders" className="hover:text-rabbit-600">Track orders</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Partners</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/merchant" className="hover:text-rabbit-600">Merchant dashboard</Link></li>
              <li><Link href="/delivery" className="hover:text-rabbit-600">Delivery partner app</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/about" className="hover:text-rabbit-600">About</Link></li>
              <li><Link href="/privacy" className="hover:text-rabbit-600">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Rabbit. Built for local commerce.
        </p>
      </div>
    </footer>
  )
}
