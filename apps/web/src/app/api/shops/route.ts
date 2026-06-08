import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { StoreType } from '@rabbit/database'

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

    const where: { isActive: boolean; storeType?: StoreType; category?: string } = {
      isActive: true,
    }

    if (storeTypeParam && VALID_STORE_TYPES.has(storeTypeParam.toUpperCase())) {
      where.storeType = storeTypeParam.toUpperCase() as StoreType
    } else if (category && category !== 'all') {
      const tab = category.toUpperCase()
      if (VALID_STORE_TYPES.has(tab)) {
        where.storeType = tab as StoreType
      }
    }

    const shops = await prisma.shop.findMany({
      where,
      include: {
        products: {
          where: { isAvailable: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = shops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      storeType: shop.storeType,
      latitude: shop.latitude,
      longitude: shop.longitude,
      rating: shop.ratingCount > 0 ? shop.ratingAvg.toFixed(1) : 'New',
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
      createdAt: shop.createdAt,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch shops'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
