'use server'

import { db } from '@/lib/db'
import {
  boundingBox,
  distanceKm,
  estimateDeliveryMinutes,
  calculateDeliveryFee,
} from '@/lib/geo'
import { CATEGORY_SLUG_MAP } from '@/lib/order-pipeline'

export interface ShopListItem {
  id: string
  slug: string
  name: string
  category: string
  image: string | null
  isActive: boolean
  deliveryFee: number
  minOrderValue: number
  distanceKm: number
  etaMinutes: number
}

export async function getNearbyShops(params: {
  lat: number
  lng: number
  radiusKm?: number
  categorySlug?: string
  openOnly?: boolean
  sortBy?: 'distance' | 'eta' | 'rating'
}): Promise<ShopListItem[]> {
  try {
    const radius = params.radiusKm ?? 5
    const box = boundingBox(params.lat, params.lng, radius)
    const categoryFilter = params.categorySlug
      ? CATEGORY_SLUG_MAP[params.categorySlug]
      : undefined

    const shops = await db.shop.findMany({
      where: {
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
        ...(params.openOnly !== false && { isActive: true }),
        ...(categoryFilter && { category: categoryFilter }),
      },
    })

    const mapped = shops
      .map((shop) => {
        const dist = distanceKm(params.lat, params.lng, shop.latitude, shop.longitude)
        if (dist > Math.min(radius, shop.deliveryRadiusKm)) return null
        return {
          id: shop.id,
          slug: shop.slug,
          name: shop.name,
          category: shop.category,
          image: shop.image,
          isActive: shop.isActive,
          deliveryFee: shop.baseDeliveryFee,
          minOrderValue: shop.minOrderValue,
          distanceKm: Math.round(dist * 10) / 10,
          etaMinutes: estimateDeliveryMinutes(dist, shop.avgPrepMinutes),
        }
      })
      .filter(Boolean) as ShopListItem[]

    const sort = params.sortBy ?? 'distance'
    mapped.sort((a, b) => {
      if (sort === 'eta') return a.etaMinutes - b.etaMinutes
      return a.distanceKm - b.distanceKm
    })

    return mapped
  } catch (err) {
    console.error('getNearbyShops failed:', err)
    return []
  }
}

export async function getShopBySlug(slug: string) {
  return db.shop.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isAvailable: true },
        orderBy: { name: 'asc' },
      },
    },
  })
}

export async function getDeliveryQuote(params: {
  shopId: string
  lat: number
  lng: number
  subtotal: number
}) {
  const fallback = {
    distanceKm: 0,
    deliveryFee: 25,
    etaMinutes: 12,
    minOrderValue: 0,
    meetsMinimum: true,
  }

  try {
    const shop = await db.shop.findFirst({
      where: { OR: [{ id: params.shopId }, { slug: params.shopId }] },
    })
    if (!shop) return fallback

    const dist = distanceKm(params.lat, params.lng, shop.latitude, shop.longitude)
    const fee = calculateDeliveryFee(shop.baseDeliveryFee, dist, params.subtotal)
    const eta = estimateDeliveryMinutes(dist, shop.avgPrepMinutes)

    return {
      distanceKm: Math.round(dist * 10) / 10,
      deliveryFee: fee,
      etaMinutes: eta,
      minOrderValue: shop.minOrderValue,
      meetsMinimum: params.subtotal >= shop.minOrderValue,
    }
  } catch {
    return fallback
  }
}
