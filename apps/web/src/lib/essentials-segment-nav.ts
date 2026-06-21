/**
 * Zepto-style inner sub-category navigation for Essentials segment pages.
 */

import type { EssentialsCatalogProduct } from '@/lib/essentials-catalog'
import type { CatalogSegmentSlug } from '@/lib/essentials-catalog-segments'
import { CATEGORY_FALLBACK_ASSET } from '@/lib/catalog-asset-path'
import { sourceCategoriesForSegment } from '@/lib/essentials-source-category-map'

export type SegmentNavItem = {
  id: string
  label: string
  /** Static thumbnail when no product image is available. */
  thumb?: string
  matches: (product: EssentialsCatalogProduct) => boolean
}

const T = CATEGORY_FALLBACK_ASSET

const EXOTIC_PATTERN =
  /\b(avocado|dragon fruit|kiwi|blueberry|raspberry|broccoli|zucchini|lettuce|bell pepper|capsicum|cherry tomato|imported|exotic|hass|plum|peach|pear|celery|asparagus|mushroom|lemon grass|dragonfruit|blueberry|cranberry|blackberry)\b/i

function isNewLaunch(name: string): boolean {
  return /\b(new launch|newly launched|just launched|introducing)\b/i.test(name)
}

function isExoticProduct(product: EssentialsCatalogProduct): boolean {
  return EXOTIC_PATTERN.test(product.name)
}

function isDryHerbSpiceName(name: string): boolean {
  return /\b(powder|whole|seeds|masala|spice|dhania|fenugreek|turmeric|chilli|chili|jeera|cumin|pepper|clove|nutmeg|cardamom)\b/i.test(
    name,
  )
}

export function getSegmentNavItems(segment: CatalogSegmentSlug): SegmentNavItem[] {
  switch (segment) {
    case 'veggies':
      return [
        { id: 'all', label: 'All', thumb: T.vegetables, matches: () => true },
        {
          id: 'fresh-vegetables',
          label: 'Fresh Vegetables',
          thumb: T.vegetables,
          matches: (p) => p.subcategory === 'Fresh Vegetables',
        },
        {
          id: 'fresh-fruits',
          label: 'Fresh Fruits',
          thumb: T.fruits,
          matches: (p) => p.subcategory === 'Fresh Fruits',
        },
        {
          id: 'new-launches',
          label: 'New Launches',
          thumb: T.premium,
          matches: (p) => isNewLaunch(p.name),
        },
        {
          id: 'exotics',
          label: 'Exotics',
          thumb: T.imported,
          matches: isExoticProduct,
        },
      ]
    case 'dairy':
      return [
        { id: 'all', label: 'All', thumb: T.milk, matches: () => true },
        {
          id: 'milk-paneer',
          label: 'Milk & Paneer',
          thumb: T.milk,
          matches: (p) => p.subcategory === 'Milk & Paneer',
        },
        {
          id: 'curd-yoghurt',
          label: 'Curd & Yoghurt',
          thumb: T.curd,
          matches: (p) => p.subcategory === 'Curd & Yoghurt',
        },
        {
          id: 'butter-cheese',
          label: 'Butter & Cheese',
          thumb: T.cheese,
          matches: (p) => p.subcategory === 'Butter & Cheese',
        },
        {
          id: 'bread-bakery',
          label: 'Bread & Bakery',
          thumb: T.bread,
          matches: (p) => p.subcategory === 'Bread & Bakery',
        },
        {
          id: 'eggs',
          label: 'Eggs',
          thumb: T.eggs,
          matches: (p) => p.subcategory === 'Eggs',
        },
      ]
    case 'masala-dry-fruits':
      return [
        { id: 'all', label: 'All', thumb: T.spices, matches: () => true },
        {
          id: 'spices',
          label: 'Spices',
          thumb: T.spices,
          matches: (p) => p.subcategory === 'Sugar, Salt & Spices',
        },
        {
          id: 'dry-fruits',
          label: 'Dry Fruits',
          thumb: T.snacks,
          matches: (p) => p.subcategory === 'Dry Fruits & Nuts',
        },
        {
          id: 'herbs-spices',
          label: 'Herbs & Spices',
          thumb: T.spices,
          matches: (p) =>
            p.subcategory === 'Herbs & Leafy Greens' && isDryHerbSpiceName(p.name),
        },
      ]
    default: {
      const sources = sourceCategoriesForSegment(segment)
      if (sources.length === 0) {
        return [{ id: 'all', label: 'All', thumb: T.general, matches: () => true }]
      }
      return [
        { id: 'all', label: 'All', thumb: T.general, matches: () => true },
        ...sources.map((source) => ({
          id: source.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          label: source,
          thumb: T.general,
          matches: (p: EssentialsCatalogProduct) => p.subcategory === source,
        })),
      ]
    }
  }
}

export type SegmentNavItemWithCount = SegmentNavItem & {
  count: number
  /** Best thumbnail: first matching product image, else static thumb. */
  thumbSrc: string | null
}

/** Hide empty sub-tabs (always keep "All"). */
export function navItemsWithCounts(
  products: EssentialsCatalogProduct[],
  items: SegmentNavItem[],
): SegmentNavItemWithCount[] {
  return items
    .map((nav) => {
      const matching = products.filter(nav.matches)
      const productThumb = matching.find((p) => p.image)?.image ?? null
      return {
        ...nav,
        count: matching.length,
        thumbSrc: productThumb ?? nav.thumb ?? null,
      }
    })
    .filter((nav) => nav.id === 'all' || nav.count > 0)
}

export function filterProductsByNavItem(
  products: EssentialsCatalogProduct[],
  nav: SegmentNavItem,
): EssentialsCatalogProduct[] {
  return products.filter(nav.matches)
}
