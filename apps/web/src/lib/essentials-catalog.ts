/**
 * Customer-facing Essentials (global catalog) constants and helpers.
 */

import type { StoreType } from '@rabbit/database'
import { normalizeCategorySlug } from '@/lib/category-routing'
import { ESSENTIALS_STORE_TYPES } from '@/lib/platform-categories'

/** MasterCatalogItem.category slugs for fresh produce (Fruits & Vegetables tab). */
export const FRESH_PRODUCE_CATEGORY_SLUGS = ['fresh-vegetables', 'fresh-fruits'] as const

/** Pantry / dry-goods slugs (spices, powders) — belong under kirana, not veggies. */
export const PANTRY_CATEGORY_SLUGS = ['herbs-leafy-greens'] as const

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
 * Strict Prisma filter for GET /api/catalog/essentials?category=…
 * Maps URL category slugs to MasterCatalogItem.category / storeType rules.
 */
export function buildEssentialsCategoryWhere(
  categorySlug: string | null | undefined,
  q?: string,
) {
  const slug = categorySlug ? normalizeCategorySlug(categorySlug) : ''

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

  const withSearch = (clause: Record<string, unknown>) =>
    searchFilter ? { AND: [clause, searchFilter] } : clause

  if (!slug || slug === 'all') {
    return withSearch({
      isActive: true,
      storeType: { in: essentialsStoreTypesList() },
    })
  }

  switch (slug) {
    case 'veggies':
    case 'vegetables':
    case 'vegetable':
      return withSearch({
        isActive: true,
        category: { in: [...FRESH_PRODUCE_CATEGORY_SLUGS] },
      })

    case 'kirana':
    case 'groceries':
    case 'grocery':
      return withSearch({
        isActive: true,
        category: { notIn: [...FRESH_PRODUCE_CATEGORY_SLUGS] },
        OR: [{ storeType: 'KIRANA' }, { category: { in: [...PANTRY_CATEGORY_SLUGS] } }],
      })

    default: {
      const storeType = categorySlugToStoreType(slug)
      if (storeType) {
        return withSearch({ isActive: true, storeType })
      }
      return withSearch({ isActive: true, category: slug })
    }
  }
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
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory ?? null,
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
