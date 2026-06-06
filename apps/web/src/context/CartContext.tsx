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
import type { CartItem } from '@/types'

type CartContextValue = {
  hydrated: boolean
  items: CartItem[]
  cartItems: CartItem[]
  shopId: string | null
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  getCartTotal: () => number
  itemCount: () => number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)

  const items = useCartStore((s) => s.items)
  const shopId = useCartStore((s) => s.shopId)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartStore((s) => s.total)
  const itemCount = useCartStore((s) => s.itemCount)

  useEffect(() => {
    const finish = () => setHydrated(true)
    const unsub = useCartStore.persist.onFinishHydration(finish)
    if (useCartStore.persist.hasHydrated()) finish()
    return unsub
  }, [])

  const value = useMemo(
    () => ({
      hydrated,
      items,
      cartItems: items,
      shopId,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      getCartTotal: total,
      itemCount,
    }),
    [
      hydrated,
      items,
      shopId,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
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
