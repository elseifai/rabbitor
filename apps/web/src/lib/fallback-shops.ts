import { FEATURED_SHOPS } from '@/lib/constants'
import { CATEGORY_SLUG_MAP } from '@/lib/order-pipeline'
import type { ShopListItem } from '@/actions/shops'

export function getFallbackShops(options?: {
  categorySlug?: string
  openOnly?: boolean
}): ShopListItem[] {
  const categoryLabel = options?.categorySlug
    ? CATEGORY_SLUG_MAP[options.categorySlug]
    : undefined

  return FEATURED_SHOPS.filter((shop) => {
    if (options?.openOnly !== false && !shop.isActive) return false
    if (!categoryLabel) return true
    const haystack = `${shop.type} ${shop.tags.join(' ')}`.toLowerCase()
    return haystack.includes(categoryLabel.toLowerCase().split(' ')[0] ?? '')
  }).map((shop) => ({
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    category: shop.type,
    image: shop.image,
    isActive: shop.isActive,
    deliveryFee: 25,
    minOrderValue: 0,
    distanceKm: parseFloat(shop.distance) || 1,
    etaMinutes: shop.deliveryMins,
  }))
}
