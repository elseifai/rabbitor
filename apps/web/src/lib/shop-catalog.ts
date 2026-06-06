/** Static hyperlocal catalog — renders instantly without waiting on the database. */

export const SHOP_ID_TO_SLUG: Record<string, string> = {
  'shop-1': 'coastal-fish',
  'shop-2': 'sharma-kirana',
  'shop-3': 'walkwell-footwear',
}

export const HOMEPAGE_FEATURED_SHOPS = [
  {
    id: 'shop-1',
    slug: 'coastal-fish',
    name: 'A1 Fresh Fish & Seafood',
    category: 'Fresh Fish & Meats',
    eta: '10-15 mins',
    rating: '4.8',
    image:
      'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=600&q=80',
    tagline: 'Fresh catch straight from the coast to your kitchen.',
  },
  {
    id: 'shop-2',
    slug: 'sharma-kirana',
    name: 'Laxmi Kirana Stores',
    category: 'Groceries & Kirana',
    eta: '8-12 mins',
    rating: '4.6',
    image:
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
    tagline: 'Your daily household essentials and monthly ration.',
  },
  {
    id: 'shop-3',
    slug: 'walkwell-footwear',
    name: 'Metro Footwear & Shoes',
    category: 'Footwear & Fashion',
    eta: '20-25 mins',
    rating: '4.3',
    image:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',
    tagline: 'Local footwear, sandals, and sports shoes delivered fast.',
  },
]

export const HOMEPAGE_CATEGORIES = [
  { name: 'Groceries', icon: '🌾' },
  { name: 'Fresh Fish', icon: '🐟' },
  { name: 'Footwear', icon: '👟' },
  { name: 'Vegetables', icon: '🥦' },
  { name: 'Local Sweets', icon: '🧁' },
]

export type CatalogProduct = {
  id: string
  name: string
  price: number
  unit: string
}

export type CatalogShop = {
  id: string
  slug: string
  name: string
  products: CatalogProduct[]
}

export const SHOP_CATALOG: Record<string, CatalogShop> = {
  'shop-1': {
    id: 'shop-1',
    slug: 'coastal-fish',
    name: 'A1 Fresh Fish & Seafood',
    products: [
      { id: '101', name: 'Pomfret (Whole)', price: 450, unit: 'kg' },
      { id: '102', name: 'Prawns Cleaned', price: 380, unit: 'gm' },
    ],
  },
  'shop-2': {
    id: 'shop-2',
    slug: 'sharma-kirana',
    name: 'Laxmi Kirana Stores',
    products: [
      { id: '201', name: 'Basmati Rice 1kg', price: 120, unit: 'kg' },
      { id: '202', name: 'Toor Dal 500g', price: 85, unit: 'gm' },
      { id: '203', name: 'Sunflower Oil 1L', price: 165, unit: 'piece' },
    ],
  },
  'shop-3': {
    id: 'shop-3',
    slug: 'walkwell-footwear',
    name: 'Metro Footwear & Shoes',
    products: [
      { id: '301', name: 'Running Shoes', price: 1299, unit: 'pair' },
      { id: '302', name: 'Leather Sandals', price: 699, unit: 'pair' },
    ],
  },
}

export function getCatalogShop(shopId: string): CatalogShop | null {
  return SHOP_CATALOG[shopId] ?? null
}

/** Resolve a catalog product id to its display name for DB matching at checkout. */
export function getCatalogProductName(productId: string): string | undefined {
  for (const shop of Object.values(SHOP_CATALOG)) {
    const product = shop.products.find((p) => p.id === productId)
    if (product) return product.name
  }
  return undefined
}
