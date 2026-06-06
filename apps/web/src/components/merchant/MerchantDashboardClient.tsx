'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getMerchantShopAction, toggleShopOpenAction } from '@/actions/merchant'

type ShopData = NonNullable<Awaited<ReturnType<typeof getMerchantShopAction>>>

export function MerchantDashboardClient() {
  const [shop, setShop] = useState<ShopData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    getMerchantShopAction()
      .then(setShop)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const toggleOpen = async () => {
    if (!shop) return
    const res = await toggleShopOpenAction(shop.id, !shop.isActive)
    if (res.ok) setShop({ ...shop, isActive: res.isActive })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-rabbit-600" />
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="text-gray-600">No shop linked to this account.</p>
        <Link href="/merchant/login" className="mt-4 text-rabbit-600">
          Log in as merchant (9876543210)
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
        <div>
          <h2 className="text-lg font-bold">{shop.name}</h2>
          <p className="text-sm text-gray-500">
            {shop.isActive ? 'Accepting orders' : 'Closed'} · {shop.products.length} products
          </p>
        </div>
        <button
          type="button"
          onClick={toggleOpen}
          className={`relative h-10 w-[4.5rem] rounded-full transition ${
            shop.isActive ? 'bg-rabbit-600' : 'bg-gray-300'
          }`}
          aria-label="Toggle shop active"
        >
          <span
            className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition ${
              shop.isActive ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/merchant/products"
          className="rounded-xl border border-rabbit-200 bg-rabbit-50 py-4 text-center font-semibold text-rabbit-700"
        >
          Manage products →
        </Link>
        <Link
          href="/merchant/orders"
          className="rounded-xl border border-gray-200 bg-white py-4 text-center font-semibold text-gray-700"
        >
          Manage orders →
        </Link>
      </div>
    </div>
  )
}
