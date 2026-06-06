/** Instant-render demo inventory for merchant stock panel (before auth/DB). */
export const MERCHANT_DEMO_SHOP = {
  id: 'demo-shop',
  name: 'A1 Fresh Fish & Kirana',
  slug: 'royal-coastal-seafood',
  isActive: true,
  category: 'Seafood',
  address: 'Andheri West, Mumbai',
  minOrderValue: 99,
  baseDeliveryFee: 25,
  avgPrepMinutes: 15,
  deliveryRadiusKm: 5,
}

export const MERCHANT_DEMO_PRODUCTS = [
  {
    id: 'demo-101',
    name: 'Fresh Surmai / Seer Fish (Cleaned)',
    price: 650,
    unit: '1 kg',
    stock: 10,
    isAvailable: true,
    image: null as string | null,
  },
  {
    id: 'demo-102',
    name: 'Premium Pomfret (Medium Size)',
    price: 450,
    unit: '500 gm',
    stock: 10,
    isAvailable: true,
    image: null,
  },
  {
    id: 'demo-103',
    name: 'Fresh Tiger Prawns',
    price: 380,
    unit: '250 gm',
    stock: 10,
    isAvailable: false,
    image: null,
  },
  {
    id: 'demo-201',
    name: 'Premium Kolam Rice',
    price: 90,
    unit: '1 kg',
    stock: 10,
    isAvailable: true,
    image: null,
  },
]

export const MERCHANT_DEMO_STATS = {
  todayOrders: 14,
  todayRevenue: 4250,
}
