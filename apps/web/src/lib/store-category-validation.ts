import {
  ALL_STORE_CATEGORY_LABELS,
  CUSTOM_STORE_CATEGORY_ID,
  findCategoryByLabel,
  formatStoreCategoryLabel,
  normalizeCategoryKey,
  type StoreCategoryOption,
} from '@/lib/store-category-options'

const TYPO_ALIASES: Record<string, string> = {
  shoees: 'Footwear',
  shoes: 'Footwear',
  footware: 'Footwear',
  footwares: 'Footwear',
  restauraunt: 'Restaurant',
  resturant: 'Restaurant',
  restaurent: 'Restaurant',
  restraunt: 'Restaurant',
  coffe: 'Cafe',
  coffeshop: 'Cafe',
  clothig: 'Clothing',
  clothings: 'Clothing',
  apparal: 'Clothing',
  gardning: 'Gardening',
  garden: 'Gardening',
  nursury: 'Gardening',
  pharamacy: 'Pharmacy',
  chemist: 'Pharmacy',
  kiranaa: 'Kirana',
  groccery: 'Grocery',
  vegitable: 'Vegetables',
  veggitable: 'Vegetables',
  sabzi: 'Vegetables',
  'sea food': 'Fish',
  chiken: 'Meat',
  mutton: 'Meat',
  dary: 'Dairy',
  bakey: 'Bakery',
  electonics: 'Electronics',
  mobile: 'Electronics',
  jewellry: 'Jewelry',
  jewellery: 'Jewelry',
  cosmetic: 'Cosmetics & Beauty',
  beauti: 'Cosmetics & Beauty',
  sport: 'Sports',
  toy: 'Toys & Kids',
  pet: 'Pet Shop',
  flower: 'Florist',
  gift: 'Gift Shop',
  'general store': 'Kirana',
  departmental: 'Supermarket',
}

const SHOP_NAME_MARKERS = [
  'pvt',
  'ltd',
  'limited',
  'llp',
  'enterprises',
  'enterprise',
  'traders',
  'trading',
  'sons',
  'brothers',
  'bros',
  'and co',
  '& co',
  'house of',
]

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost)
    }
  }
  return dp[m]![n]!
}

function looksLikeShopName(input: string, shopName: string): boolean {
  const normInput = normalizeCategoryKey(input)
  const normShop = normalizeCategoryKey(shopName)

  if (!normInput || !normShop) return false
  if (normInput === normShop) return true
  if (normShop.includes(normInput) && normInput.length > 4) return true
  if (normInput.includes(normShop) && normShop.length > 4) return true

  const shopWords = normShop.split(' ').filter((w) => w.length > 2)
  const inputWords = normInput.split(' ')
  const overlap = shopWords.filter((w) => inputWords.includes(w))
  if (overlap.length >= 2) return true
  if (overlap.length === 1 && shopWords.length <= 2) return true

  const lower = input.toLowerCase()
  if (SHOP_NAME_MARKERS.some((m) => lower.includes(m))) return true

  // "Masoli Mart" style — ends with mart/shop/store as business name, not category alone
  if (/\b(mart|emporium|bhandar|agency)\b/i.test(input) && input.split(' ').length > 1) {
    return true
  }

  return false
}

function closestLabel(input: string): { label: string; distance: number } | null {
  const norm = normalizeCategoryKey(input)
  let best: { label: string; distance: number } | null = null
  for (const label of ALL_STORE_CATEGORY_LABELS) {
    const d = levenshtein(norm, normalizeCategoryKey(label))
    if (!best || d < best.distance) best = { label, distance: d }
  }
  return best
}

export type StoreCategoryValidation =
  | { ok: true; label: string; corrected: boolean; matched?: StoreCategoryOption }
  | { ok: false; error: string; suggestion?: string }

/** Resolve custom text to a canonical category label with spell-check. */
export function validateCustomStoreCategory(
  raw: string,
  shopName: string,
): StoreCategoryValidation {
  const trimmed = raw.trim()
  if (trimmed.length < 2) {
    return { ok: false, error: 'Enter a store type (e.g. Footwear, Restaurant).' }
  }
  if (trimmed.length > 40) {
    return { ok: false, error: 'Store type is too long. Use a category name, not a description.' }
  }

  if (looksLikeShopName(trimmed, shopName)) {
    return {
      ok: false,
      error: 'This looks like your shop name. Enter a store type (e.g. Footwear, Cafe), not your business name.',
    }
  }

  const aliasKey = normalizeCategoryKey(trimmed).replace(/\s+/g, ' ')
  if (TYPO_ALIASES[aliasKey]) {
    const label = TYPO_ALIASES[aliasKey]!
    const matched = findCategoryByLabel(label)
    return { ok: true, label, corrected: true, matched }
  }

  const exact = findCategoryByLabel(trimmed)
  if (exact) {
    return { ok: true, label: exact.label, corrected: false, matched: exact }
  }

  const formatted = formatStoreCategoryLabel(trimmed)
  const formattedMatch = findCategoryByLabel(formatted)
  if (formattedMatch) {
    return { ok: true, label: formattedMatch.label, corrected: formatted !== trimmed, matched: formattedMatch }
  }

  const closest = closestLabel(formatted)
  if (closest && closest.distance > 0 && closest.distance <= 2) {
    return {
      ok: false,
      error: `"${formatted}" is not a recognized store type.`,
      suggestion: closest.label,
    }
  }

  if (/^\d+$/.test(trimmed) || /[@#]/.test(trimmed)) {
    return { ok: false, error: 'Store type should be a category name, not codes or symbols.' }
  }

  // Accept novel but well-formed custom categories (Title Case)
  if (!/^[A-Za-z][A-Za-z0-9 &'-]*$/.test(formatted)) {
    return {
      ok: false,
      error: 'Use letters only, in Title Case (e.g. Footwear, Cloud Kitchen).',
    }
  }

  return { ok: true, label: formatted, corrected: formatted !== trimmed }
}

export function isStoreTypeStepValid(params: {
  categoryId: string
  customCategory: string
  shopName: string
}): boolean {
  if (params.categoryId !== CUSTOM_STORE_CATEGORY_ID) return true
  return validateCustomStoreCategory(params.customCategory, params.shopName).ok
}
