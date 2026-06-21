/**
 * Customer-facing Essentials (global catalog) constants and helpers.
 */

import type { StoreType } from '@rabbit/database'
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
