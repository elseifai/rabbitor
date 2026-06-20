import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { StoreType } from '@rabbit/database'

import { isRestaurantShop } from '@/lib/home-feed-config'
import { getActivePromoShopIds } from '@/lib/ad-subscription'
import { searchWeightFromDistance } from '@/lib/search-weight'

const VALID_STORE_TYPES = new Set([
  'KIRANA',
  'FISH',
  'VEGETABLE',
  'PHARMACY',
  'BAKERY',
  'DAIRY',
  'MEAT',
  'GENERAL',
])

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')
    const storeTypeParam = searchParams.get('storeType')
    const vertical = searchParams.get('vertical')

    const where: { isActive: boolean; storeType?: StoreType; category?: string } = {
      isActive: true,
    }

    const storeTypeFilter =
      storeTypeParam && VALID_STORE_TYPES.has(storeTypeParam.toUpperCase())
        ? (storeTypeParam.toUpperCase() as StoreType)
        : category && category !== 'all' && VALID_STORE_TYPES.has(category.toUpperCase())
          ? (category.toUpperCase() as StoreType)
          : undefined

    if (vertical !== 'restaurants' && storeTypeFilter) {
      where.storeType = storeTypeFilter
    }

    const shops = await prisma.shop.findMany({
      where,
      include: {
        products: {
          where: { isAvailable: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: storeTypeFilter
        ? [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }]
        : { createdAt: 'desc' },
    })

    const filtered =
      vertical === 'restaurants'
        ? shops.filter((s) =>
            isRestaurantShop({ name: s.name, category: s.category, storeType: s.storeType }),
          )
        : shops

    // Apply +50 search weight boost for stores with active ad subscriptions
    const promoIds = await getActivePromoShopIds(filtered.map((s) => s.id))

    const data = filtered
      .map((shop) => {
        const hasPromo = promoIds.has(shop.id)
        const weight = searchWeightFromDistance(0, hasPromo) // distance-agnostic boost for web feed
        return {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          storeType: shop.storeType,
          latitude: shop.latitude,
          longitude: shop.longitude,
          rating: shop.ratingCount > 0 ? shop.ratingAvg.toFixed(1) : 'New',
          ratingAvg: shop.ratingAvg,
          ratingCount: shop.ratingCount,
          time: `${shop.avgPrepMinutes}-${shop.avgPrepMinutes + 5} mins`,
          cuisine: shop.category,
          category: shop.category,
          location: shop.address,
          deliveryFee: shop.baseDeliveryFee,
          etaMinutes: shop.avgPrepMinutes,
          image:
            shop.image ??
            'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=500&q=80',
          products: shop.products.map((p) => ({
            id: p.id,
            name: p.name,
            desc: p.description,
            price: p.price,
            mrp: p.mrp,
            weight: p.unit,
            unit: p.unit,
            image: p.image,
            stock: p.stock,
            isAvailable: p.isAvailable,
            shopId: p.shopId,
          })),
          searchWeight: weight,
          hasPromoBoost: hasPromo,
          createdAt: shop.createdAt,
        }
      })
      // Sponsored stores float to the top; within same tier sort by rating
      .sort((a, b) => {
        if (b.searchWeight !== a.searchWeight) return b.searchWeight - a.searchWeight
        return b.ratingAvg - a.ratingAvg
      })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch shops'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
