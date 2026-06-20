import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActivePromoShopIds } from '@/lib/ad-subscription'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')

    let resolvedShopId = shopId ?? undefined
    if (shopId) {
      const shop = await prisma.shop.findFirst({
        where: { OR: [{ id: shopId }, { slug: shopId }] },
        select: { id: true },
      })
      if (!shop) {
        return NextResponse.json({ success: true, data: [] })
      }
      resolvedShopId = shop.id
    }

    const products = await prisma.product.findMany({
      where: resolvedShopId ? { shopId: resolvedShopId } : undefined,
      include: {
        shop: { select: { id: true, name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const uniqueShopIds = [...new Set(products.map((p) => p.shopId))]
    const promoIds = await getActivePromoShopIds(uniqueShopIds)

    const data = products
      .map((p) => ({
        id: p.id,
        name: p.name,
        desc: p.description,
        price: p.price,
        weight: p.unit,
        isAvailable: p.isAvailable,
        shopId: p.shopId,
        category: p.shop.category,
        shopName: p.shop.name,
        hasPromoBoost: promoIds.has(p.shopId),
        searchWeight: promoIds.has(p.shopId) ? 150 : 100,
      }))
      // Sponsored-store products surface first
      .sort((a, b) => b.searchWeight - a.searchWeight)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch products'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
