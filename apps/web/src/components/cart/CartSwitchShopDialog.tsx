'use client'

import { useCartStore } from '@/store'

export function CartSwitchShopDialog() {
  const pendingItem = useCartStore((s) => s.pendingItem)
  const confirmSwitchShop = useCartStore((s) => s.confirmSwitchShop)
  const cancelSwitchShop = useCartStore((s) => s.cancelSwitchShop)
  const currentStoreName = useCartStore((s) => s.items[0]?.storeName)

  if (!pendingItem) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/40 p-4">
      <div className="w-full rounded-2xl bg-white p-6">
        <p className="font-bold text-gray-900">Start a new cart?</p>
        <p className="mt-1 text-sm text-gray-500">
          Your cart has items from{' '}
          <strong>{currentStoreName ?? 'another shop'}</strong>. Adding from{' '}
          <strong>{pendingItem.item.storeName}</strong> will clear it.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={cancelSwitchShop}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700"
          >
            Keep current cart
          </button>
          <button
            type="button"
            onClick={confirmSwitchShop}
            className="flex-1 rounded-xl bg-[#FF6B35] py-3 text-sm font-bold text-white"
          >
            Start new cart
          </button>
        </div>
      </div>
    </div>
  )
}
