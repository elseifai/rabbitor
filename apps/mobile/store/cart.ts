import { create } from 'zustand'

export type CartItem = {
  productId: string
  shopId: string
  name: string
  price: number
  image?: string | null
  quantity: number
}

interface CartStore {
  items: CartItem[]
  shopId: string | null
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  shopId: null,
  addItem: (item, qty = 1) => {
    set((state) => {
      const otherShop = state.items.find((i) => i.shopId !== item.shopId)
      const baseItems = otherShop ? [] : state.items
      const existing = baseItems.find((i) => i.productId === item.productId)
      const nextItems = existing
        ? baseItems.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i,
          )
        : [...baseItems, { ...item, quantity: qty }]
      return { items: nextItems, shopId: item.shopId }
    })
  },
  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.productId !== productId)
          : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    })),
  clearCart: () => set({ items: [], shopId: null }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
