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

export interface CartConflict {
  incomingItem: CartItemInput
  existingStoreName: string
}

interface CartStore {
  items: CartLineItem[]
  activeStoreId: string | null
  activeStoreName: string | null
  cartConflict: CartConflict | null
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

const emptyCart = {
  items: [] as CartLineItem[],
  activeStoreId: null as string | null,
  activeStoreName: null as string | null,
  cartConflict: null as CartConflict | null,
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

function resetIfEmpty(items: CartLineItem[]) {
  if (items.length === 0) {
    return { ...emptyCart, cartConflict: null }
  }
  return { items }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...emptyCart,

      addItem: (item, qty = 1) => {
        set((state) => {
          if (state.activeStoreId === null) {
            return {
              items: appendItem([], item, qty),
              activeStoreId: item.storeId,
              activeStoreName: item.storeName,
              cartConflict: null,
            }
          }

          if (state.activeStoreId !== item.storeId) {
            return {
              cartConflict: {
                incomingItem: item,
                existingStoreName:
                  state.activeStoreName ?? 'your current store',
              },
            }
          }

          return {
            items: appendItem(state.items, item, qty),
            cartConflict: null,
          }
        })
      },

      clearAndAddItem: (item, qty = 1) => {
        set({
          items: appendItem([], item, qty),
          activeStoreId: item.storeId,
          activeStoreName: item.storeName,
          cartConflict: null,
        })
      },

      clearConflict: () => set({ cartConflict: null }),

      removeItem: (id) =>
        set((state) => resetIfEmpty(state.items.filter((i) => i.id !== id))),

      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return resetIfEmpty(state.items.filter((i) => i.id !== id))
          }
          return {
            items: state.items.map((i) =>
              i.id === id ? { ...i, quantity } : i,
            ),
          }
        }),

      clearCart: () => set({ ...emptyCart }),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      total: () => get().subtotal(),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'rabbit-cart',
      version: 1,
      partialize: (state) => ({
        items: state.items,
        activeStoreId: state.activeStoreId,
        activeStoreName: state.activeStoreName,
      }),
      migrate: (persisted, version) => {
        if (version >= 1) return persisted as Partial<CartStore>

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
          shopId?: string | null
          activeStoreId?: string | null
          activeStoreName?: string | null
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

        const activeStoreId =
          legacy.activeStoreId ?? legacy.shopId ?? items[0]?.storeId ?? null
        const activeStoreName =
          legacy.activeStoreName ?? items[0]?.storeName ?? null

        return { items, activeStoreId, activeStoreName }
      },
    },
  ),
)
