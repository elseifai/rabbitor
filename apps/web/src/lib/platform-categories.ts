/**
 * Hybrid Platform Model — Rabbitors
 *
 * ESSENTIALS MASTER GLOBAL VIEW
 *   Items in Grocery, Pharmacy, Vegetables, and Fish/Meat categories are
 *   loaded from the central repository at https://rabbitor.elseif.ai/admin.
 *   Customers browse via one unified storefront — the system routes to the
 *   nearest dark store automatically, with store-choice modal on inventory split.
 *
 * MERCHANT MARKETPLACE HUB
 *   Food Restaurants, Snacks, Cloud Kitchens, Clothes, and Shoes are
 *   independent merchant storefronts. Customers select a shop first, then browse.
 */

export type PlatformModel = 'ESSENTIALS' | 'MARKETPLACE'

/** Admin API base URL — central catalog repository */
export const ADMIN_API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ?? 'https://rabbitor.elseif.ai'

// ─── Essentials ──────────────────────────────────────────────────────────────

/** DB store types that belong to the Essentials global catalog */
export const ESSENTIALS_STORE_TYPES = new Set([
  'KIRANA',    // Grocery
  'PHARMACY',  // Pharmacy
  'VEGETABLE', // Vegetables
  'FISH',      // Fresh Fish
  'MEAT',      // Meat & Poultry
  'DAIRY',     // Dairy (essentials-adjacent)
])

/** URL category slugs that map to the Essentials platform */
export const ESSENTIALS_CATEGORY_SLUGS = new Set([
  'groceries',
  'grocery',
  'pharmacy',
  'vegetables',
  'vegetable',
  'fresh-fish',
  'fish',
  'meat',
  'dairy',
  'kirana',
  'veggies',
])

export const ESSENTIALS_DISPLAY_CATEGORIES = [
  { slug: 'groceries',  label: 'Grocery',    storeType: 'KIRANA',    icon: '🛒', color: '#F59E0B' },
  { slug: 'pharmacy',   label: 'Pharmacy',   storeType: 'PHARMACY',  icon: '💊', color: '#10B981' },
  { slug: 'vegetables', label: 'Vegetables', storeType: 'VEGETABLE', icon: '🥦', color: '#22C55E' },
  { slug: 'fresh-fish', label: 'Fish & Meat', storeType: 'FISH',     icon: '🐟', color: '#3B82F6' },
] as const

// ─── Marketplace ─────────────────────────────────────────────────────────────

/** DB store types that belong to the Merchant Marketplace Hub */
export const MARKETPLACE_STORE_TYPES = new Set([
  'RESTAURANT',
  'CLOUD_KITCHEN',
  'GENERAL', // Clothes, Shoes, Snacks
  'BAKERY',
])

export const MARKETPLACE_CATEGORY_SLUGS = new Set([
  'restaurants',
  'food',
  'snacks',
  'cloud-kitchens',
  'clothing',
  'clothes',
  'footwear',
  'shoes',
  'bakery',
  'general',
])

export const MARKETPLACE_DISPLAY_CATEGORIES = [
  { slug: 'restaurants',    label: 'Restaurants',    storeType: 'RESTAURANT',    icon: '🍽️', color: '#EF4444' },
  { slug: 'snacks',         label: 'Snacks',         storeType: 'GENERAL',       icon: '🍿', color: '#F97316' },
  { slug: 'cloud-kitchens', label: 'Cloud Kitchens', storeType: 'CLOUD_KITCHEN', icon: '☁️', color: '#8B5CF6' },
  { slug: 'clothing',       label: 'Clothes',        storeType: 'GENERAL',       icon: '👕', color: '#EC4899' },
  { slug: 'footwear',       label: 'Shoes',          storeType: 'GENERAL',       icon: '👟', color: '#6366F1' },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPlatformModel(categoryOrStoreType: string): PlatformModel {
  const lower = categoryOrStoreType.toLowerCase()
  if (ESSENTIALS_CATEGORY_SLUGS.has(lower)) return 'ESSENTIALS'
  if (MARKETPLACE_CATEGORY_SLUGS.has(lower)) return 'MARKETPLACE'
  if (ESSENTIALS_STORE_TYPES.has(categoryOrStoreType.toUpperCase())) return 'ESSENTIALS'
  if (MARKETPLACE_STORE_TYPES.has(categoryOrStoreType.toUpperCase())) return 'MARKETPLACE'
  return 'MARKETPLACE'
}

export function isEssentialsCategory(slug: string): boolean {
  return ESSENTIALS_CATEGORY_SLUGS.has(slug.toLowerCase())
}

export function isMarketplaceCategory(slug: string): boolean {
  return MARKETPLACE_CATEGORY_SLUGS.has(slug.toLowerCase())
}

export function isEssentialsStoreType(storeType: string): boolean {
  return ESSENTIALS_STORE_TYPES.has(storeType.toUpperCase())
}

export function isMarketplaceStoreType(storeType: string): boolean {
  return MARKETPLACE_STORE_TYPES.has(storeType.toUpperCase())
}

/** Human-readable labels and branding for each platform model */
export const PLATFORM_META: Record<PlatformModel, {
  title: string
  subtitle: string
  badge: string
  accentColor: string
  etaLabel: string
}> = {
  ESSENTIALS: {
    title: 'Essentials',
    subtitle: 'From central catalog · Nearest dark store dispatches',
    badge: 'GLOBAL CATALOG',
    accentColor: '#0C831F',
    etaLabel: '⚡ 10–15 Mins',
  },
  MARKETPLACE: {
    title: 'Marketplace',
    subtitle: 'Browse merchant storefronts & order directly',
    badge: 'MERCHANT HUB',
    accentColor: '#FF6B35',
    etaLabel: '🏪 25–45 Mins',
  },
}
