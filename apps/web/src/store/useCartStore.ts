import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartLineItem {
  id: string
  name: string
  price: number
  quantity: number
  storeId: string
  storeName: string
  image?: string
}

export type CartItemInput = Omit<CartLineItem, 'quantity'>

interface CartStore {
  items: CartLineItem[]
  addItem: (item: CartItemInput, qty?: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  itemsByShop: () => Record<string, CartLineItem[]>
  shopIds: () => string[]
  subtotal: () => number
  subtotalForShop: (shopId: string) => number
  total: () => number
  itemCount: () => number
}

function appendItem(
  items: CartLineItem[],
  item: CartItemInput,
  qty: number,
): CartLineItem[] {
  const existing = items.find((i) => i.id === item.id)
  if (existing) {
    return items.map((i) =>
      i.id === item.id ? { ...i, quantity: i.quantity + qty } : i,
    )
  }
  return [...items, { ...item, quantity: qty }]
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1) => {
        set((state) => ({
          items: appendItem(state.items, item, qty),
        }))
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== id) }
          }
          return {
            items: state.items.map((i) =>
              i.id === id ? { ...i, quantity } : i,
            ),
          }
        }),

      clearCart: () => set({ items: [] }),

      itemsByShop: () => {
        const grouped: Record<string, CartLineItem[]> = {}
        for (const item of get().items) {
          if (!grouped[item.storeId]) grouped[item.storeId] = []
          grouped[item.storeId]!.push(item)
        }
        return grouped
      },

      shopIds: () => [...new Set(get().items.map((i) => i.storeId))],

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      subtotalForShop: (shopId) =>
        get()
          .items.filter((i) => i.storeId === shopId)
          .reduce((sum, i) => sum + i.price * i.quantity, 0),

      total: () => get().subtotal(),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'rabbit-cart',
      version: 2,
      partialize: (state) => ({ items: state.items }),
      migrate: (persisted, version) => {
        const legacy = persisted as {
          items?: Array<{
            productId?: string
            id?: string
            name: string
            price: number
            quantity: number
            shopId?: string
            storeId?: string
            shopName?: string
            storeName?: string
            image?: string
          }>
          activeStoreId?: string | null
          shopId?: string | null
        }

        const items = (legacy.items ?? []).map((item) => ({
          id: item.id ?? item.productId ?? '',
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          storeId: item.storeId ?? item.shopId ?? '',
          storeName: item.storeName ?? item.shopName ?? '',
          image: item.image,
        }))

        if (version >= 2) {
          return { items } as { items: CartLineItem[] }
        }

        return { items }
      },
    },
  ),
)
