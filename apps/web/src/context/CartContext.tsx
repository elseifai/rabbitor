'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CartConflictModal } from '@/components/cart/CartConflictModal'
import { useCartStore } from '@/store'
import type { CartItemInput, CartLineItem } from '@/store'

type CartContextValue = {
  hydrated: boolean
  items: CartLineItem[]
  shopId: string | null
  activeStoreId: string | null
  activeStoreName: string | null
  cartConflict: ReturnType<typeof useCartStore.getState>['cartConflict']
  addItem: (item: CartItemInput, qty?: number) => void
  clearAndAddItem: (item: CartItemInput, qty?: number) => void
  clearConflict: () => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  subtotal: () => number
  total: () => number
  itemCount: () => number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)

  const items = useCartStore((s) => s.items)
  const activeStoreId = useCartStore((s) => s.activeStoreId)
  const activeStoreName = useCartStore((s) => s.activeStoreName)
  const cartConflict = useCartStore((s) => s.cartConflict)
  const addItem = useCartStore((s) => s.addItem)
  const clearAndAddItem = useCartStore((s) => s.clearAndAddItem)
  const clearConflict = useCartStore((s) => s.clearConflict)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const subtotal = useCartStore((s) => s.subtotal)
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
      shopId: activeStoreId,
      activeStoreId,
      activeStoreName,
      cartConflict,
      addItem,
      clearAndAddItem,
      clearConflict,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      total,
      itemCount,
    }),
    [
      hydrated,
      items,
      activeStoreId,
      activeStoreName,
      cartConflict,
      addItem,
      clearAndAddItem,
      clearConflict,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      total,
      itemCount,
    ],
  )

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartConflictModal />
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
