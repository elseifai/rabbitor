'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useCartStore } from '@/store'
import type { CartItemInput, CartLineItem } from '@/store'

type CartContextValue = {
  hydrated: boolean
  items: CartLineItem[]
  shopId: string | null
  shopIds: string[]
  itemsByShop: Record<string, CartLineItem[]>
  addItem: (item: CartItemInput, qty?: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  subtotal: () => number
  subtotalForShop: (shopId: string) => number
  total: () => number
  itemCount: () => number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)

  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const itemsByShopFn = useCartStore((s) => s.itemsByShop)
  const shopIdsFn = useCartStore((s) => s.shopIds)
  const subtotal = useCartStore((s) => s.subtotal)
  const subtotalForShop = useCartStore((s) => s.subtotalForShop)
  const total = useCartStore((s) => s.total)
  const itemCount = useCartStore((s) => s.itemCount)

  useEffect(() => {
    const finish = () => setHydrated(true)
    const unsub = useCartStore.persist.onFinishHydration(finish)
    if (useCartStore.persist.hasHydrated()) finish()
    return unsub
  }, [])

  const itemsByShop = itemsByShopFn()
  const shopIds = shopIdsFn()
  const shopId = shopIds[0] ?? null

  const value = useMemo(
    () => ({
      hydrated,
      items,
      shopId,
      shopIds,
      itemsByShop,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      subtotalForShop,
      total,
      itemCount,
    }),
    [
      hydrated,
      items,
      shopId,
      shopIds,
      itemsByShop,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      subtotalForShop,
      total,
      itemCount,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
