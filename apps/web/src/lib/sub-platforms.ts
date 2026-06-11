export type SubPlatformId = 'all' | 'grocery' | 'fresh' | 'fashion'

export const SUB_PLATFORM_IDS: SubPlatformId[] = [
  'all',
  'grocery',
  'fresh',
  'fashion',
]

export type SubPlatformTab = {
  id: SubPlatformId
  label: string
  activePill: string
  activeText: string
  idleText: string
}

export const SUB_PLATFORM_TABS: SubPlatformTab[] = [
  {
    id: 'all',
    label: 'Rabbit',
    activePill: 'bg-gradient-to-r from-[#FF6B35] to-[#FF8F65] shadow-[0_4px_14px_rgba(255,107,53,0.35)]',
    activeText: 'text-white',
    idleText: 'text-[#FF6B35]',
  },
  {
    id: 'grocery',
    label: 'Super Mart',
    activePill: 'bg-gradient-to-r from-[#4338CA] to-[#6366F1] shadow-[0_4px_14px_rgba(99,102,241,0.35)]',
    activeText: 'text-white',
    idleText: 'text-[#4338CA]',
  },
  {
    id: 'fresh',
    label: 'Fresh Farm',
    activePill: 'bg-gradient-to-r from-[#059669] to-[#34D399] shadow-[0_4px_14px_rgba(5,150,105,0.35)]',
    activeText: 'text-white',
    idleText: 'text-[#059669]',
  },
  {
    id: 'fashion',
    label: 'Boutique / Hub',
    activePill: 'bg-gradient-to-r from-[#DB2777] via-[#EC4899] to-[#1C1C1C] shadow-[0_4px_14px_rgba(219,39,119,0.35)]',
    activeText: 'text-white',
    idleText: 'text-[#DB2777]',
  },
]

export type SubPlatformConfig = {
  etaLabel: string
  etaTone: string
  productVariant: 'GROCERY' | 'RETAIL'
  showGroceryLayouts: boolean
  showFashionDeals: boolean
  storeTypes?: string[]
}

export const SUB_PLATFORM_CONFIG: Record<SubPlatformId, SubPlatformConfig> = {
  all: {
    etaLabel: '⚡ 10 Mins',
    etaTone: 'bg-[#FFF3E0] text-[#D4380D]',
    productVariant: 'GROCERY',
    showGroceryLayouts: true,
    showFashionDeals: false,
  },
  grocery: {
    etaLabel: '⚡ 10 Mins',
    etaTone: 'bg-indigo-50 text-indigo-700',
    productVariant: 'GROCERY',
    showGroceryLayouts: true,
    showFashionDeals: false,
    storeTypes: ['KIRANA', 'DAIRY', 'BAKERY', 'GENERAL'],
  },
  fresh: {
    etaLabel: '⚡ 15 Mins',
    etaTone: 'bg-emerald-50 text-emerald-700',
    productVariant: 'GROCERY',
    showGroceryLayouts: true,
    showFashionDeals: false,
    storeTypes: ['VEGETABLE', 'FISH', 'MEAT', 'DAIRY'],
  },
  fashion: {
    etaLabel: '🕒 Delivery in 45 Mins',
    etaTone: 'bg-[#1C1C1C] text-white',
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
  { label: 'Denim Edit', tag: 'Style' },
  { label: 'Footwear Fiesta', tag: '₹599' },
] as const

export function parseSubPlatformId(value: string | null): SubPlatformId {
  if (value && SUB_PLATFORM_IDS.includes(value as SubPlatformId)) {
    return value as SubPlatformId
  }
  return 'all'
}
