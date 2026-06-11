export type SubPlatformId = 'all' | 'grocery' | 'fresh' | 'fashion'

export type SubPlatformTab = {
  id: SubPlatformId
  label: string
  pillColor: string
  activeText: string
  idleText: string
}

export const SUB_PLATFORM_TABS: SubPlatformTab[] = [
  {
    id: 'all',
    label: 'Rabbit',
    pillColor: '#FF6B35',
    activeText: '#FFFFFF',
    idleText: '#FF6B35',
  },
  {
    id: 'grocery',
    label: 'Super Mart',
    pillColor: '#4F46E5',
    activeText: '#FFFFFF',
    idleText: '#4338CA',
  },
  {
    id: 'fresh',
    label: 'Fresh Farm',
    pillColor: '#059669',
    activeText: '#FFFFFF',
    idleText: '#059669',
  },
  {
    id: 'fashion',
    label: 'Boutique / Hub',
    pillColor: '#DB2777',
    activeText: '#FFFFFF',
    idleText: '#DB2777',
  },
]

export type SubPlatformConfig = {
  etaLabel: string
  etaBg: string
  etaText: string
  productVariant: 'GROCERY' | 'RETAIL'
  showGroceryLayouts: boolean
  showFashionDeals: boolean
  storeTypes?: string[]
}

export const SUB_PLATFORM_CONFIG: Record<SubPlatformId, SubPlatformConfig> = {
  all: {
    etaLabel: '⚡ 10 Mins',
    etaBg: '#FFF3E0',
    etaText: '#D4380D',
    productVariant: 'GROCERY',
    showGroceryLayouts: true,
    showFashionDeals: false,
  },
  grocery: {
    etaLabel: '⚡ 10 Mins',
    etaBg: '#EEF2FF',
    etaText: '#4338CA',
    productVariant: 'GROCERY',
    showGroceryLayouts: true,
    showFashionDeals: false,
    storeTypes: ['KIRANA', 'DAIRY', 'BAKERY', 'GENERAL'],
  },
  fresh: {
    etaLabel: '⚡ 15 Mins',
    etaBg: '#ECFDF5',
    etaText: '#059669',
    productVariant: 'GROCERY',
    showGroceryLayouts: true,
    showFashionDeals: false,
    storeTypes: ['VEGETABLE', 'FISH', 'MEAT', 'DAIRY'],
  },
  fashion: {
    etaLabel: '🕒 Delivery in 45 Mins',
    etaBg: '#1C1C1C',
    etaText: '#FFFFFF',
    productVariant: 'RETAIL',
    showGroceryLayouts: false,
    showFashionDeals: true,
    storeTypes: ['GENERAL'],
  },
}

export const FASHION_DEAL_BADGES = [
  { label: 'Sneakers Under ₹599', tag: '🔥 Hot' },
  { label: 'Ethnic Kurtas', tag: 'New' },
  { label: 'Office Formals', tag: 'Trending' },
  { label: 'Activewear', tag: '−40%' },
  { label: 'Bags & Totes', tag: 'Under ₹499' },
  { label: 'Kids Fashion', tag: 'Fresh' },
] as const

export const ROTATING_SEARCH_KEYWORDS = [
  'milk and bread',
  'fresh Alphonso mangoes',
  'running shoes',
  'snacks & munchies',
  'attena / charging cables',
] as const
