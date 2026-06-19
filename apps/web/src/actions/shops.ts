'use server'

import type { StoreType } from '@rabbit/database'
import { prisma } from '@/lib/prisma'
import {
  boundingBox,
  distanceKm,
  estimateDeliveryMinutes,
  calculateDeliveryFee,
} from '@/lib/geo'
import { getPlatformSettings } from '@/lib/platform-settings'
import { CATEGORY_SLUG_MAP } from '@/lib/order-pipeline'
import { getActivePromoShopIds } from '@/lib/ad-subscription'
import { effectiveSortDistance } from '@/lib/search-weight'

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
  ratingAvg?: number
  ratingCount?: number
  searchWeight?: number
  hasPromoBoost?: boolean
}

export async function getNearbyShops(params: {
  lat: number
  lng: number
  radiusKm?: number
  categorySlug?: string
  storeType?: string
  openOnly?: boolean
  sortBy?: 'distance' | 'eta' | 'rating'
}): Promise<ShopListItem[]> {
  try {
    const radius = params.radiusKm ?? 15
    const box = boundingBox(params.lat, params.lng, radius)
    const categoryFilter = params.categorySlug
      ? CATEGORY_SLUG_MAP[params.categorySlug]
      : undefined

    const shops = await prisma.shop.findMany({
      where: {
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
        ...(params.openOnly !== false && { isActive: true }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(params.storeType && { storeType: params.storeType as StoreType }),
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
          ratingAvg: shop.ratingAvg,
          ratingCount: shop.ratingCount,
          _rawDist: dist,
        }
      })
      .filter(Boolean) as (ShopListItem & { _rawDist: number })[]

    const promoIds = await getActivePromoShopIds(mapped.map((s) => s.id))
    const enriched = mapped.map((shop) => {
      const hasPromo = promoIds.has(shop.id)
      const { _rawDist, ...rest } = shop
      return {
        ...rest,
        hasPromoBoost: hasPromo,
        searchWeight: Math.round((100 - _rawDist * 10 + (hasPromo ? 50 : 0)) * 10) / 10,
        _effectiveDist: effectiveSortDistance(_rawDist, hasPromo),
      }
    })

    const sort = params.sortBy ?? 'distance'
    enriched.sort((a, b) => {
      if (sort === 'rating') {
        const ratingDiff = (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0)
        if (ratingDiff !== 0) return ratingDiff
        return (b.ratingCount ?? 0) - (a.ratingCount ?? 0)
      }
      if (sort === 'eta') return a.etaMinutes - b.etaMinutes
      return a._effectiveDist - b._effectiveDist
    })

    return enriched.map(({ _effectiveDist, ...shop }) => shop)
  } catch (err) {
    console.error('getNearbyShops failed:', err)
    return []
  }
}

export async function getShopBySlug(slug: string) {
  return prisma.shop.findUnique({
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
    const shop = await prisma.shop.findFirst({
      where: { OR: [{ id: params.shopId }, { slug: params.shopId }] },
    })
    if (!shop) return fallback

    const dist = distanceKm(params.lat, params.lng, shop.latitude, shop.longitude)
    const platform = await getPlatformSettings()
    const fee = calculateDeliveryFee(
      shop.baseDeliveryFee,
      dist,
      params.subtotal,
      platform.freeDeliveryThreshold,
    )
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

export async function getMultiShopDeliveryQuote(params: {
  shops: { shopId: string; subtotal: number }[]
  lat: number
  lng: number
}) {
  const platform = await getPlatformSettings()
  const quotes = await Promise.all(
    params.shops.map((s) =>
      getDeliveryQuote({
        shopId: s.shopId,
        lat: params.lat,
        lng: params.lng,
        subtotal: s.subtotal,
      }),
    ),
  )

  const perShopDelivery = quotes.reduce((sum, q) => sum + q.deliveryFee, 0)
  const multiShopRoutingFee =
    params.shops.length > 1
      ? (params.shops.length - 1) * platform.multiShopRoutingFeePerLeg
      : 0

  return {
    perShopDelivery,
    multiShopRoutingFee,
    totalDeliveryFee: perShopDelivery + multiShopRoutingFee,
    shopCount: params.shops.length,
    quotes,
    globalMinCartValue: platform.globalMinCartValue,
  }
}
