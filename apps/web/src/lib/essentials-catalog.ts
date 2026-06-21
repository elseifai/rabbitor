/**
 * Customer-facing Essentials (global catalog) constants and helpers.
 */

import type { StoreType } from '@rabbit/database'
import { normalizeCategorySlug } from '@/lib/category-routing'
import {
  filterProductsBySegment,
  normalizeCatalogSegmentSlug,
  resolveProductCatalogSegment,
  type CatalogSegmentSlug,
} from '@/lib/essentials-catalog-segments'
import { ESSENTIALS_STORE_TYPES } from '@/lib/platform-categories'

/** Virtual store id used in cart for global-catalog Essentials items. */
export const ESSENTIALS_STORE_ID = 'global-essentials'

export const ESSENTIALS_STORE_NAME = 'Rabbit Essentials'

export const ESSENTIALS_STORE_SLUG = 'essentials'

export type EssentialsCatalogProduct = {
  id: string
  name: string
  description: string | null
  category: string
  subcategory: string | null
  catalogSegment: CatalogSegmentSlug
  price: number
  mrp: number | null
  unit: string
  image: string | null
  storeType: StoreType
  inStock: boolean
  storeId: string
  storeName: string
  storeSlug: string
}

/** Map URL / feed category slugs to Prisma storeType filters. */
export function categorySlugToStoreType(slug: string): StoreType | undefined {
  const map: Record<string, StoreType> = {
    kirana: 'KIRANA',
    groceries: 'KIRANA',
    grocery: 'KIRANA',
    pharmacy: 'PHARMACY',
    vegetables: 'VEGETABLE',
    vegetable: 'VEGETABLE',
    veggies: 'VEGETABLE',
    'fresh-fish': 'FISH',
    fish: 'FISH',
    meat: 'MEAT',
    dairy: 'DAIRY',
  }
  return map[slug.toLowerCase()]
}

export function isEssentialsStoreId(storeId: string): boolean {
  return storeId === ESSENTIALS_STORE_ID
}

export function essentialsStoreTypesList(): StoreType[] {
  return [...ESSENTIALS_STORE_TYPES] as StoreType[]
}

/**
 * Broad Prisma filter — segment matching happens in memory via product name logic.
 */
export function buildEssentialsBroadWhere(q?: string) {
  const searchFilter = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { category: { contains: q, mode: 'insensitive' as const } },
          { subcategory: { contains: q, mode: 'insensitive' as const } },
          { sku: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : undefined

  const base = {
    isActive: true,
    storeType: { in: essentialsStoreTypesList() },
  }

  return searchFilter ? { AND: [base, searchFilter] } : base
}

/** @deprecated Use buildEssentialsBroadWhere + filterProductsBySegment */
export function buildEssentialsCategoryWhere(
  categorySlug: string | null | undefined,
  q?: string,
) {
  return buildEssentialsBroadWhere(q)
}

export function filterEssentialsByCategorySlug<
  T extends {
    id: string
    name: string
    category: string
    subcategory: string | null
    storeType: StoreType
    unit?: string
  },
>(items: T[], categorySlug: string | null | undefined): T[] {
  if (!categorySlug) return items
  const normalized = normalizeCategorySlug(categorySlug)
  const segment = normalizeCatalogSegmentSlug(normalized)
  if (!segment) return items
  return filterProductsBySegment(items, segment)
}

/** Collapse duplicate catalog rows (same name/unit) to a single card. */
export function dedupeEssentialsCatalogProducts<T extends EssentialsCatalogProduct>(
  items: T[],
): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const item of items) {
    const key = `${item.name.trim().toLowerCase()}::${(item.unit ?? '').trim().toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }
  return unique
}

export function mapMasterItemToEssentialsProduct(item: {
  id: string
  name: string
  description: string | null
  category: string
  subcategory?: string | null
  basePrice: number
  defaultUnit: string
  imageUrl: string | null
  storeType: StoreType
}): EssentialsCatalogProduct {
  const catalogSegment = resolveProductCatalogSegment({
    name: item.name,
    category: item.category,
    subcategory: item.subcategory ?? null,
    storeType: item.storeType,
  })

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory ?? null,
    catalogSegment,
    price: item.basePrice,
    mrp: null,
    unit: item.defaultUnit,
    image: item.imageUrl,
    storeType: item.storeType,
    inStock: true,
    storeId: ESSENTIALS_STORE_ID,
    storeName: ESSENTIALS_STORE_NAME,
    storeSlug: ESSENTIALS_STORE_SLUG,
  }
}
