import type { StoreType } from '@rabbit/database'

export type StoreCategoryOption = {
  id: string
  label: string
  platformType: StoreType
  group: string
  keywords?: string[]
}

export const CUSTOM_STORE_CATEGORY_ID = 'custom'

/** Indian quick-commerce & local retail categories mapped to platform store types. */
export const STORE_CATEGORY_OPTIONS: StoreCategoryOption[] = [
  // Groceries & staples
  { id: 'kirana', label: 'Kirana', platformType: 'KIRANA', group: 'Groceries & Daily Needs', keywords: ['general store', 'provision'] },
  { id: 'grocery', label: 'Grocery', platformType: 'KIRANA', group: 'Groceries & Daily Needs' },
  { id: 'supermarket', label: 'Supermarket', platformType: 'KIRANA', group: 'Groceries & Daily Needs' },
  { id: 'organic', label: 'Organic Foods', platformType: 'KIRANA', group: 'Groceries & Daily Needs' },
  { id: 'snacks', label: 'Snacks & Namkeen', platformType: 'KIRANA', group: 'Groceries & Daily Needs' },
  // Fresh
  { id: 'vegetable', label: 'Vegetables', platformType: 'VEGETABLE', group: 'Fresh Produce', keywords: ['veggies', 'sabzi'] },
  { id: 'fruits', label: 'Fruits', platformType: 'VEGETABLE', group: 'Fresh Produce' },
  { id: 'fish', label: 'Fish', platformType: 'FISH', group: 'Fresh Produce', keywords: ['seafood'] },
  { id: 'meat', label: 'Meat', platformType: 'MEAT', group: 'Fresh Produce', keywords: ['chicken', 'mutton'] },
  { id: 'dairy', label: 'Dairy', platformType: 'DAIRY', group: 'Fresh Produce', keywords: ['milk', 'paneer'] },
  { id: 'bakery', label: 'Bakery', platformType: 'BAKERY', group: 'Fresh Produce', keywords: ['bread', 'pav'] },
  { id: 'sweets', label: 'Sweets & Mithai', platformType: 'BAKERY', group: 'Fresh Produce' },
  { id: 'icecream', label: 'Ice Cream', platformType: 'BAKERY', group: 'Fresh Produce' },
  // Health
  { id: 'pharmacy', label: 'Pharmacy', platformType: 'PHARMACY', group: 'Health & Wellness', keywords: ['medical', 'chemist'] },
  { id: 'ayurveda', label: 'Ayurveda', platformType: 'PHARMACY', group: 'Health & Wellness' },
  { id: 'fitness', label: 'Fitness & Supplements', platformType: 'GENERAL', group: 'Health & Wellness' },
  // Food service
  { id: 'restaurant', label: 'Restaurant', platformType: 'GENERAL', group: 'Food & Beverages', keywords: ['dhaba', 'eatery'] },
  { id: 'cafe', label: 'Cafe', platformType: 'GENERAL', group: 'Food & Beverages', keywords: ['coffee', 'tea'] },
  { id: 'cloudkitchen', label: 'Cloud Kitchen', platformType: 'GENERAL', group: 'Food & Beverages' },
  { id: 'juice', label: 'Juice Bar', platformType: 'GENERAL', group: 'Food & Beverages' },
  { id: 'chaat', label: 'Chaat & Street Food', platformType: 'GENERAL', group: 'Food & Beverages' },
  // Fashion & lifestyle
  { id: 'footwear', label: 'Footwear', platformType: 'GENERAL', group: 'Fashion & Lifestyle', keywords: ['shoes', 'sandals', 'footware'] },
  { id: 'clothing', label: 'Clothing', platformType: 'GENERAL', group: 'Fashion & Lifestyle', keywords: ['apparel', 'fashion', 'garments'] },
  { id: 'ethnicwear', label: 'Ethnic Wear', platformType: 'GENERAL', group: 'Fashion & Lifestyle' },
  { id: 'jewelry', label: 'Jewelry', platformType: 'GENERAL', group: 'Fashion & Lifestyle', keywords: ['jewellery'] },
  { id: 'cosmetics', label: 'Cosmetics & Beauty', platformType: 'GENERAL', group: 'Fashion & Lifestyle', keywords: ['salon', 'makeup'] },
  { id: 'optician', label: 'Optician', platformType: 'GENERAL', group: 'Fashion & Lifestyle', keywords: ['eyewear', 'spectacles'] },
  // Home & garden
  { id: 'gardening', label: 'Gardening', platformType: 'GENERAL', group: 'Home & Garden', keywords: ['nursery', 'plants', 'seeds'] },
  { id: 'hardware', label: 'Hardware', platformType: 'GENERAL', group: 'Home & Garden', keywords: ['tools', 'plumbing'] },
  { id: 'furniture', label: 'Furniture', platformType: 'GENERAL', group: 'Home & Garden' },
  { id: 'homedecor', label: 'Home Decor', platformType: 'GENERAL', group: 'Home & Garden' },
  { id: 'kitchenware', label: 'Kitchenware', platformType: 'GENERAL', group: 'Home & Garden' },
  // Electronics & more
  { id: 'electronics', label: 'Electronics', platformType: 'GENERAL', group: 'Electronics & Services', keywords: ['mobile', 'gadgets'] },
  { id: 'stationery', label: 'Stationery', platformType: 'GENERAL', group: 'Electronics & Services', keywords: ['books', 'xerox'] },
  { id: 'toys', label: 'Toys & Kids', platformType: 'GENERAL', group: 'Electronics & Services' },
  { id: 'sports', label: 'Sports', platformType: 'GENERAL', group: 'Electronics & Services' },
  { id: 'petshop', label: 'Pet Shop', platformType: 'GENERAL', group: 'Electronics & Services' },
  { id: 'florist', label: 'Florist', platformType: 'GENERAL', group: 'Electronics & Services', keywords: ['flowers'] },
  { id: 'giftshop', label: 'Gift Shop', platformType: 'GENERAL', group: 'Electronics & Services' },
  { id: 'laundry', label: 'Laundry & Dry Clean', platformType: 'GENERAL', group: 'Electronics & Services' },
  { id: 'general', label: 'General', platformType: 'GENERAL', group: 'Other' },
]

export const STORE_CATEGORY_GROUPS = STORE_CATEGORY_OPTIONS.reduce<
  { group: string; options: StoreCategoryOption[] }[]
>((acc, opt) => {
  const existing = acc.find((g) => g.group === opt.group)
  if (existing) existing.options.push(opt)
  else acc.push({ group: opt.group, options: [opt] })
  return acc
}, [])

export const ALL_STORE_CATEGORY_LABELS = STORE_CATEGORY_OPTIONS.map((o) => o.label)

export function findCategoryById(id: string): StoreCategoryOption | undefined {
  return STORE_CATEGORY_OPTIONS.find((o) => o.id === id)
}

export function findCategoryByLabel(label: string): StoreCategoryOption | undefined {
  const norm = normalizeCategoryKey(label)
  return STORE_CATEGORY_OPTIONS.find(
    (o) =>
      normalizeCategoryKey(o.label) === norm ||
      o.keywords?.some((k) => normalizeCategoryKey(k) === norm),
  )
}

export function normalizeCategoryKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Title Case matching list style: "Ice Cream", "Cloud Kitchen" */
export function formatStoreCategoryLabel(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  return cleaned
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase()
      if (lower === 'and' || lower === 'or' || lower === 'of') return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}
