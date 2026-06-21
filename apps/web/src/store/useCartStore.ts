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
  pendingItem: { item: CartItemInput; qty: number } | null

  /** Selected dark-store ID chosen via the fulfillment modal before payment. */
  selectedFulfillmentStoreId: string | null
  /** Whether the fulfillment store selection has been confirmed by the customer. */
  fulfillmentConfirmed: boolean

  addItem: (item: CartItemInput, qty?: number) => void
  confirmSwitchShop: () => void
  cancelSwitchShop: () => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  itemsByShop: () => Record<string, CartLineItem[]>
  shopIds: () => string[]
  subtotal: () => number
  subtotalForShop: (shopId: string) => number
  total: () => number
  itemCount: () => number

  /** Bind the customer-selected fulfillment store to the active checkout session. */
  setFulfillmentStore: (storeId: string | null) => void
  /** Mark that the customer has confirmed the fulfillment store choice. */
  confirmFulfillmentStore: () => void
  /** Reset fulfillment selection (called on cart clear or new items added). */
  resetFulfillment: () => void
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
      pendingItem: null,
      selectedFulfillmentStoreId: null,
      fulfillmentConfirmed: false,

      setFulfillmentStore: (storeId) =>
        set({ selectedFulfillmentStoreId: storeId, fulfillmentConfirmed: false }),

      confirmFulfillmentStore: () =>
        set({ fulfillmentConfirmed: true }),

      resetFulfillment: () =>
        set({ selectedFulfillmentStoreId: null, fulfillmentConfirmed: false }),

      addItem: (item, qty = 1) => {
        set((state) => {
          const isDifferentShop =
            state.items.length > 0 &&
            state.items.some((i) => i.storeId !== item.storeId)

          if (isDifferentShop) {
            return { pendingItem: { item, qty } }
          }

          return { items: appendItem(state.items, item, qty) }
        })
      },

      confirmSwitchShop: () => {
        set((state) => {
          if (!state.pendingItem) return {}
          const { item, qty } = state.pendingItem
          return {
            items: [{ ...item, quantity: qty }],
            pendingItem: null,
          }
        })
      },

      cancelSwitchShop: () => set({ pendingItem: null }),

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

      clearCart: () =>
        set({ items: [], pendingItem: null, selectedFulfillmentStoreId: null, fulfillmentConfirmed: false }),

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
