import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
      resolvedShopId = shop?.id
    }

    const products = await prisma.product.findMany({
      where: resolvedShopId ? { shopId: resolvedShopId } : undefined,
      include: {
        shop: { select: { id: true, name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      desc: p.description,
      price: p.price,
      weight: p.unit,
      isAvailable: p.isAvailable,
      shopId: p.shopId,
      category: p.shop.category,
      shopName: p.shop.name,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch products'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
