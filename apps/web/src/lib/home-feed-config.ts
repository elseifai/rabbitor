import type { SubPlatformId } from '@/lib/sub-platforms'

export type HomeFeedCategoryItem = {
  label: string
  image: string
  category: string
}

export type HomeFeedCategorySection = {
  title: string
  row1: HomeFeedCategoryItem[]
  row2: HomeFeedCategoryItem[]
  row3: HomeFeedCategoryItem[]
}

export type HomeFeedCoupon = {
  title: string
  sub: string
  cashback: string
  image?: string | null
}

export type HomeFeedSubPlatformTab = {
  id: SubPlatformId
  label: string
  route?: string | null
}

export type HomeFeedCategoryTab = {
  id: string
  label: string
  storeType?: string
  active?: boolean
}

export type HomeFeedSubCategory = {
  id: string
  label: string
  slug: string
  sortOrder: number
}

export type HomeFeedMasterCategory = {
  id: string
  label: string
  slug: string
  image: string
  tags: string[]
  active: boolean
  featured: boolean
  section: 'groceryKitchen' | 'snacksDrinks'
  subcategories: HomeFeedSubCategory[]
  sortOrder: number
}

export type HomeFeedComponentToggles = {
  categoryBar: boolean
  promoBanner: boolean
  flashDeals: boolean
  grocerySection: boolean
  snacksSection: boolean
  coupons: boolean
}

export type HomeFeedConfig = {
  subPlatformTabs: HomeFeedSubPlatformTab[]
  categoryTabs: HomeFeedCategoryTab[]
  masterCategories: HomeFeedMasterCategory[]
  groceryKitchen: HomeFeedCategorySection
  snacksDrinks: HomeFeedCategorySection
  coupons: HomeFeedCoupon[]
  dealsSection: { title: string; subtitle: string; fashionTitle: string; fashionSubtitle: string }
  storesSection: { title: string; subtitleGrocery: string; subtitleFashion: string }
  promoBanner: { badge: string; headline: string; price: string; subtitle: string; image?: string | null }
  fashionDealBadges: { label: string; tag: string }[]
  componentToggles: HomeFeedComponentToggles
}

export const DEFAULT_COMPONENT_TOGGLES: HomeFeedComponentToggles = {
  categoryBar: true,
  promoBanner: true,
  flashDeals: true,
  grocerySection: true,
  snacksSection: true,
  coupons: true,
}

function deriveMasterCategoriesFromSections(
  groceryKitchen: HomeFeedCategorySection,
  snacksDrinks: HomeFeedCategorySection,
): HomeFeedMasterCategory[] {
  const categories: HomeFeedMasterCategory[] = []
  let sortOrder = 0

  for (const section of ['groceryKitchen', 'snacksDrinks'] as const) {
    const sec = section === 'groceryKitchen' ? groceryKitchen : snacksDrinks
    for (const row of ['row1', 'row2', 'row3'] as const) {
      for (const item of sec[row]) {
        categories.push({
          id: `mc-${sortOrder}-${item.category}`,
          label: item.label,
          slug: item.category,
          image: item.image,
          tags: [],
          active: true,
          featured: false,
          section,
          subcategories: [],
          sortOrder: sortOrder++,
        })
      }
    }
  }
  return categories
}

export function syncSectionsFromMasterCategories(
  masterCategories: HomeFeedMasterCategory[],
  existing: Pick<HomeFeedConfig, 'groceryKitchen' | 'snacksDrinks'>,
): Pick<HomeFeedConfig, 'groceryKitchen' | 'snacksDrinks'> {
  const toItem = (c: HomeFeedMasterCategory): HomeFeedCategoryItem => ({
    label: c.label,
    image: c.image,
    category: c.slug,
  })

  const buildSection = (
    sectionKey: 'groceryKitchen' | 'snacksDrinks',
    base: HomeFeedCategorySection,
  ): HomeFeedCategorySection => {
    const items = masterCategories
      .filter((c) => c.active && c.section === sectionKey)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toItem)
    return {
      title: base.title,
      row1: items.slice(0, 2),
      row2: items.slice(2, 5),
      row3: items.slice(5, 8),
    }
  }

  return {
    groceryKitchen: buildSection('groceryKitchen', existing.groceryKitchen),
    snacksDrinks: buildSection('snacksDrinks', existing.snacksDrinks),
  }
}

export const DEFAULT_HOME_FEED_CONFIG: HomeFeedConfig = {
  subPlatformTabs: [
    { id: 'all', label: 'Rabbit' },
    { id: 'grocery', label: 'Super Mart' },
    { id: 'restaurants', label: 'Restaurants / Cafés', route: '/restaurants' },
    { id: 'fashion', label: 'Boutique / Hub' },
  ],
  categoryTabs: [
    { id: 'all', label: 'All 🏠', active: true },
    { id: 'kirana', label: 'Kirana 🛒', storeType: 'KIRANA', active: true },
    { id: 'fish', label: 'Fish 🐟', storeType: 'FISH', active: true },
    { id: 'veggies', label: 'Veggies 🥦', storeType: 'VEGETABLE', active: true },
    { id: 'pharmacy', label: 'Pharmacy 💊', storeType: 'PHARMACY', active: true },
    { id: 'dairy', label: 'Dairy 🥛', storeType: 'DAIRY', active: true },
    { id: 'meat', label: 'Meat 🥩', storeType: 'MEAT', active: true },
    { id: 'bakery', label: 'Bakery 🍞', storeType: 'BAKERY', active: true },
    { id: 'general', label: 'General 📦', storeType: 'GENERAL', active: true },
  ],
  masterCategories: [],
  groceryKitchen: {
    title: 'Grocery & Kitchen',
    row1: [
      {
        label: 'Fruits & Vegetables',
        image: 'https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=400&q=80',
        category: 'veggies',
      },
      {
        label: 'Dairy, Bread & Eggs',
        image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=80',
        category: 'dairy',
      },
    ],
    row2: [
      {
        label: 'Atta, Rice, Oil & Dals',
        image: 'https://images.unsplash.com/photo-1586201375761-83865001bb31?w=300&q=80',
        category: 'atta-rice-oil-dals',
      },
      {
        label: 'Meat, Fish & Eggs',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&q=80',
        category: 'meat-fish-eggs',
      },
      {
        label: 'Masala & Dry Fruits',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&q=80',
        category: 'masala-dry-fruits',
      },
    ],
    row3: [
      {
        label: 'Breakfast & Sauces',
        image: 'https://images.unsplash.com/photo-1533089860890-a1b1f0a111f2?w=300&q=80',
        category: 'breakfast-sauces',
      },
      {
        label: 'Packaged Food',
        image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&q=80',
        category: 'packaged-food',
      },
      {
        label: 'Frozen Food',
        image: 'https://images.unsplash.com/photo-1574484993793-17bb9792c2a0?w=300&q=80',
        category: 'frozen-food',
      },
    ],
  },
  snacksDrinks: {
    title: 'Snacks & Drinks',
    row1: [
      {
        label: 'Tea, Coffee & More',
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
        category: 'tea-coffee',
      },
      {
        label: 'Ice Creams & More',
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80',
        category: 'ice-cream',
      },
    ],
    row2: [
      {
        label: 'Sweet Cravings',
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&q=80',
        category: 'sweet-cravings',
      },
      {
        label: 'Cold Drinks & Juices',
        image: 'https://images.unsplash.com/photo-1625772262779-944d945891bf?w=300&q=80',
        category: 'cold-drinks',
      },
      {
        label: 'Munchies',
        image: 'https://images.unsplash.com/photo-1613919113640-25732ed5d960?w=300&q=80',
        category: 'munchies',
      },
    ],
    row3: [
      {
        label: 'Biscuits & Cookies',
        image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&q=80',
        category: 'biscuits-cookies',
      },
      {
        label: 'Noodles & Pasta',
        image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&q=80',
        category: 'noodles-pasta',
      },
      {
        label: 'Spreads & Dips',
        image: 'https://images.unsplash.com/photo-1623428187425-1379a2a2a18?w=300&q=80',
        category: 'spreads-dips',
      },
    ],
  },
  coupons: [
    { title: 'FLAT ₹50 OFF', sub: 'above ₹199', cashback: 'Get ₹50 cashback on UPI', image: null },
    { title: 'FLAT ₹20 OFF', sub: 'above ₹299', cashback: 'Get ₹20 off on cards', image: null },
    { title: 'FLAT ₹100 OFF', sub: 'above ₹400', cashback: 'Get ₹100 off on fish', image: null },
  ],
  dealsSection: {
    title: 'Flash Deals: All Time Low',
    subtitle: 'Fresh Essentials Every Day',
    fashionTitle: 'Boutique Picks: Under ₹599',
    fashionSubtitle: 'Curated apparel, footwear & accessories',
  },
  storesSection: {
    title: 'Stores near you',
    subtitleGrocery: 'Delivering in 15-30 mins',
    subtitleFashion: 'Same-day delivery available',
  },
  promoBanner: {
    badge: 'EXCLUSIVE OFFER',
    headline: 'Products Starting from Just ₹1!',
    price: '₹1',
    subtitle: 'Swipe to browse lowest-price deals',
    image: null,
  },
  fashionDealBadges: [
    { label: 'Sneakers Under ₹599', tag: '🔥 Hot' },
    { label: 'Ethnic Kurtas', tag: 'New' },
    { label: 'Office Formals', tag: 'Trending' },
    { label: 'Activewear', tag: '−40%' },
  ],
  componentToggles: DEFAULT_COMPONENT_TOGGLES,
}

DEFAULT_HOME_FEED_CONFIG.masterCategories = deriveMasterCategoriesFromSections(
  DEFAULT_HOME_FEED_CONFIG.groceryKitchen,
  DEFAULT_HOME_FEED_CONFIG.snacksDrinks,
)

function mergeCategorySection(
  base: HomeFeedCategorySection,
  patch?: Partial<HomeFeedCategorySection>,
): HomeFeedCategorySection {
  if (!patch) return base
  return {
    title: patch.title ?? base.title,
    row1: patch.row1?.length ? patch.row1 : base.row1,
    row2: patch.row2?.length ? patch.row2 : base.row2,
    row3: patch.row3?.length ? patch.row3 : base.row3,
  }
}

function normalizeSubPlatformTabs(
  patch?: HomeFeedSubPlatformTab[],
): HomeFeedSubPlatformTab[] {
  const base = DEFAULT_HOME_FEED_CONFIG.subPlatformTabs
  if (!patch?.length) return base

  return base.map((defaultTab) => {
    const saved =
      patch.find((t) => t.id === defaultTab.id) ??
      (defaultTab.id === 'restaurants'
        ? patch.find((t) => (t.id as string) === 'fresh')
        : undefined)
    if (!saved) return defaultTab
    const staleFresh = (saved.id as string) === 'fresh' && saved.label === 'Fresh Farm'
    return {
      id: defaultTab.id,
      label: staleFresh ? defaultTab.label : saved.label,
      route: saved.route ?? defaultTab.route ?? null,
    }
  })
}

export function mergeHomeFeedConfig(raw: unknown): HomeFeedConfig {
  const patch = (raw && typeof raw === 'object' ? raw : {}) as Partial<HomeFeedConfig>
  const groceryKitchen = mergeCategorySection(
    DEFAULT_HOME_FEED_CONFIG.groceryKitchen,
    patch.groceryKitchen,
  )
  const snacksDrinks = mergeCategorySection(
    DEFAULT_HOME_FEED_CONFIG.snacksDrinks,
    patch.snacksDrinks,
  )

  const masterCategories = patch.masterCategories?.length
    ? patch.masterCategories
    : deriveMasterCategoriesFromSections(groceryKitchen, snacksDrinks)

  const synced = syncSectionsFromMasterCategories(masterCategories, {
    groceryKitchen,
    snacksDrinks,
  })

  return {
    subPlatformTabs: normalizeSubPlatformTabs(patch.subPlatformTabs),
    categoryTabs: patch.categoryTabs?.length
      ? patch.categoryTabs.map((t) => ({ active: true, ...t }))
      : DEFAULT_HOME_FEED_CONFIG.categoryTabs,
    masterCategories,
    groceryKitchen: synced.groceryKitchen,
    snacksDrinks: synced.snacksDrinks,
    coupons: patch.coupons?.length ? patch.coupons : DEFAULT_HOME_FEED_CONFIG.coupons,
    dealsSection: { ...DEFAULT_HOME_FEED_CONFIG.dealsSection, ...patch.dealsSection },
    storesSection: { ...DEFAULT_HOME_FEED_CONFIG.storesSection, ...patch.storesSection },
    promoBanner: { ...DEFAULT_HOME_FEED_CONFIG.promoBanner, ...patch.promoBanner },
    fashionDealBadges: patch.fashionDealBadges?.length
      ? patch.fashionDealBadges
      : DEFAULT_HOME_FEED_CONFIG.fashionDealBadges,
    componentToggles: {
      ...DEFAULT_COMPONENT_TOGGLES,
      ...patch.componentToggles,
    },
  }
}

export function isRestaurantShop(shop: {
  name: string
  category: string
  storeType?: string
}): boolean {
  const hay = `${shop.name} ${shop.category}`.toLowerCase()
  const keywords = [
    'restaurant',
    'cafe',
    'café',
    'cloud kitchen',
    'cloud-kitchen',
    'biryani',
    'diner',
    'eatery',
    'food court',
  ]
  if (shop.storeType === 'BAKERY') return true
  if (keywords.some((k) => hay.includes(k))) return true
  return hay.includes('kitchen') && !hay.includes('kirana')
}
