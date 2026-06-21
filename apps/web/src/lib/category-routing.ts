/**
 * Category → route resolution for the hybrid Essentials / Marketplace model.
 */

import type { PlatformModel } from '@/lib/platform-categories'
import {
  ESSENTIALS_CATEGORY_SLUGS,
  ESSENTIALS_STORE_TYPES,
  MARKETPLACE_CATEGORY_SLUGS,
  MARKETPLACE_STORE_TYPES,
} from '@/lib/platform-categories'
import {
  isCatalogSegmentSlug,
  segmentLabel,
} from '@/lib/essentials-catalog-segments'
import { STORE_TYPE_LINK } from '@/lib/categories'

/** Normalize home-feed / CMS category values to URL slugs (e.g. KIRANA → kirana). */
export function normalizeCategorySlug(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  const fromStoreType = STORE_TYPE_LINK[trimmed.toUpperCase()]
  if (fromStoreType) return fromStoreType
  return trimmed.toLowerCase()
}

/** Home-feed / shops tab ids that map to Essentials global catalog. */
const ESSENTIALS_TAB_IDS = new Set([
  ...ESSENTIALS_CATEGORY_SLUGS,
  'kirana',
  'veggies',
])

/** Home-feed tab ids that map to merchant marketplace store grids. */
const MARKETPLACE_TAB_IDS = new Set([
  ...MARKETPLACE_CATEGORY_SLUGS,
  'bakery',
  'general',
])

export function getPlatformModelForCategory(slug: string): PlatformModel {
  const lower = slug.toLowerCase()
  if (lower === 'all') return 'ESSENTIALS'
  if (ESSENTIALS_TAB_IDS.has(lower) || ESSENTIALS_CATEGORY_SLUGS.has(lower)) {
    return 'ESSENTIALS'
  }
  if (MARKETPLACE_TAB_IDS.has(lower) || MARKETPLACE_CATEGORY_SLUGS.has(lower)) {
    return 'MARKETPLACE'
  }
  const upper = slug.toUpperCase()
  if (ESSENTIALS_STORE_TYPES.has(upper)) return 'ESSENTIALS'
  if (MARKETPLACE_STORE_TYPES.has(upper)) return 'MARKETPLACE'
  return 'MARKETPLACE'
}

export function isEssentialsCategorySlug(slug: string): boolean {
  const lower = slug.toLowerCase()
  if (isCatalogSegmentSlug(lower)) return true
  return getPlatformModelForCategory(slug) === 'ESSENTIALS'
}

export function isMarketplaceCategorySlug(slug: string): boolean {
  return getPlatformModelForCategory(slug) === 'MARKETPLACE'
}

/** Customer-facing route when a category tile or tab is pressed. */
export function resolveCategoryHref(categorySlug: string): string {
  const slug = normalizeCategorySlug(categorySlug)
  if (!slug || slug === 'all') return '/'

  if (slug === 'restaurants' || slug === 'food') return '/restaurants'

  if (isEssentialsCategorySlug(slug)) {
    return `/essentials?category=${encodeURIComponent(slug)}`
  }

  return `/shops?category=${encodeURIComponent(slug)}`
}

/** Human label for essentials category pages. */
export const ESSENTIALS_CATEGORY_LABELS: Record<string, string> = {
  kirana: 'Grocery & Kitchen',
  groceries: 'Grocery',
  grocery: 'Grocery',
  veggies: 'Vegetables',
  vegetables: 'Vegetables',
  vegetable: 'Vegetables',
  pharmacy: 'Pharmacy',
  fish: 'Fish & Meat',
  'fresh-fish': 'Fish & Meat',
  meat: 'Meat',
  dairy: 'Dairy',
}

export function essentialsCategoryLabel(slug: string): string {
  const lower = slug.toLowerCase()
  if (isCatalogSegmentSlug(lower)) return segmentLabel(lower)
  return ESSENTIALS_CATEGORY_LABELS[lower] ?? slug
}
