/**
 * Zepto / CSV source category → Essentials display segment.
 * Mirrors the production architectural mapping matrix (Rabbitor_all_products.csv).
 */

import type { CatalogSegmentSlug } from '@/lib/essentials-catalog-segments'

/** Raw importer Category column → customer segment slug. */
export const SOURCE_CATEGORY_TO_SEGMENT: Record<string, CatalogSegmentSlug> = {
  // Grocery & Kitchen
  'Fresh Vegetables': 'veggies',
  'Fresh Fruits': 'veggies',
  'Milk & Paneer': 'dairy',
  'Butter & Cheese': 'dairy',
  'Curd & Yoghurt': 'dairy',
  'Bread & Bakery': 'dairy',
  Eggs: 'dairy',
  'Rice & Atta': 'atta-rice-oil-dals',
  'Dal & Lentils': 'atta-rice-oil-dals',
  'Cooking Oil': 'atta-rice-oil-dals',
  'Chicken & Mutton': 'meat-fish-eggs',
  'Fish & Seafood': 'meat-fish-eggs',
  'Sugar, Salt & Spices': 'masala-dry-fruits',
  'Herbs & Leafy Greens': 'masala-dry-fruits',
  'Dry Fruits & Nuts': 'masala-dry-fruits',
  'Breakfast Cereal': 'breakfast-sauces',
  'Muesli & Oats': 'breakfast-sauces',
  'Jams & Spreads': 'breakfast-sauces',
  'Sauces & Condiments': 'breakfast-sauces',
  'Ready to Eat': 'packaged-food',
  'Frozen Food': 'frozen-food',

  // Snacks & Drinks
  'Tea & Coffee': 'tea-coffee',
  'Ice Cream': 'ice-cream',
  'Sweets & Mithai': 'sweet-cravings',
  'Chocolate & Candy': 'sweet-cravings',
  'Cold Drinks & Juices': 'cold-drinks',
  'Energy Drinks': 'cold-drinks',
  Water: 'cold-drinks',
  'Chips & Crisps': 'munchies',
  Munchies: 'munchies',
  'Biscuits & Cookies': 'biscuits-cookies',
  'Noodles & Pasta': 'noodles-pasta',
}

/** Human display labels (for CSV Display_Category column). */
export const SEGMENT_TO_DISPLAY_LABEL: Record<CatalogSegmentSlug, string> = {
  veggies: 'Fruits & Vegetables',
  dairy: 'Dairy, Bread & Eggs',
  'atta-rice-oil-dals': 'Atta, Rice, Oil & Dals',
  'meat-fish-eggs': 'Meat, Fish & Eggs',
  'masala-dry-fruits': 'Masala & Dry Fruits',
  'breakfast-sauces': 'Breakfast & Sauces',
  'packaged-food': 'Packaged Food',
  'frozen-food': 'Frozen Food',
  'tea-coffee': 'Tea, Coffee & More',
  'ice-cream': 'Ice Creams & More',
  'cold-drinks': 'Cold Drinks & Juices',
  munchies: 'Munchies',
  'biscuits-cookies': 'Biscuits & Cookies',
  'noodles-pasta': 'Noodles & Pasta',
  'spreads-dips': 'Spreads & Dips',
  'sweet-cravings': 'Sweet Cravings',
  pharmacy: 'Pharmacy',
  kirana: 'Grocery & Kitchen',
}

/** Source categories outside Essentials browse — excluded from segment grids. */
export const NON_ESSENTIALS_SOURCE_CATEGORIES = new Set([
  'Baby Care',
  'Pet Care',
  'Shampoo & Conditioner',
  'Feminine Hygiene',
  'Mobile Accessories',
  'Cigarettes',
  'Air Fresheners',
  'Sexual Wellness',
  'Garbage Bags',
  'Floor & Surface Cleaners',
  'Deodorant & Perfume',
  'Soap & Body Wash',
  'Face Care',
  'Oral Care',
  'Paan Corner',
  'Detergents & Dishwash',
])

const SOURCE_LOOKUP = new Map<string, CatalogSegmentSlug>(
  Object.entries(SOURCE_CATEGORY_TO_SEGMENT).map(([k, v]) => [k.toLowerCase(), v]),
)

/** Source categories that belong exclusively to Dairy, Bread & Eggs. */
export const DAIRY_SOURCE_CATEGORIES = new Set([
  'Milk & Paneer',
  'Butter & Cheese',
  'Curd & Yoghurt',
  'Eggs',
  'Bread & Bakery',
])

/** Source categories that belong exclusively to Masala & Dry Fruits. */
export const MASALA_SOURCE_CATEGORIES = new Set([
  'Sugar, Salt & Spices',
  'Dry Fruits & Nuts',
  'Herbs & Leafy Greens',
])

const DAIRY_SOURCE_LOOKUP = new Set(
  [...DAIRY_SOURCE_CATEGORIES].map((c) => c.toLowerCase()),
)
const MASALA_SOURCE_LOOKUP = new Set(
  [...MASALA_SOURCE_CATEGORIES].map((c) => c.toLowerCase()),
)

export function isDairySourceCategory(sourceCategory: string | null | undefined): boolean {
  if (!sourceCategory?.trim()) return false
  return DAIRY_SOURCE_LOOKUP.has(sourceCategory.trim().toLowerCase())
}

export function isMasalaSourceCategory(sourceCategory: string | null | undefined): boolean {
  if (!sourceCategory?.trim()) return false
  return MASALA_SOURCE_LOOKUP.has(sourceCategory.trim().toLowerCase())
}

export function sourceCategoriesForSegment(segment: CatalogSegmentSlug): string[] {
  return Object.entries(SOURCE_CATEGORY_TO_SEGMENT)
    .filter(([, slug]) => slug === segment)
    .map(([source]) => source)
}

export function lookupSourceCategorySegment(
  sourceCategory: string | null | undefined,
): CatalogSegmentSlug | null {
  if (!sourceCategory?.trim()) return null
  return SOURCE_LOOKUP.get(sourceCategory.trim().toLowerCase()) ?? null
}

export function isNonEssentialsSourceCategory(
  sourceCategory: string | null | undefined,
): boolean {
  if (!sourceCategory?.trim()) return false
  return NON_ESSENTIALS_SOURCE_CATEGORIES.has(sourceCategory.trim())
}

export function displayLabelForSourceCategory(sourceCategory: string): string {
  const segment = lookupSourceCategorySegment(sourceCategory)
  if (segment) return SEGMENT_TO_DISPLAY_LABEL[segment]
  return sourceCategory
}
