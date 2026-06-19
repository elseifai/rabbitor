import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const IMPULSE_CATEGORIES: Record<string, string[]> = {
  kirana: ['snacks', 'dairy', 'beverages', 'general'],
  dairy: ['snacks', 'beverages', 'bakery'],
  vegetable: ['dairy', 'snacks', 'general'],
  fish: ['snacks', 'general'],
  pharmacy: ['general', 'snacks'],
  bakery: ['dairy', 'beverages', 'snacks'],
  general: ['snacks', 'beverages', 'dairy'],
}

type CartShopInput = { shopId: string; productIds?: string[] }

function parseCartQuery(searchParams: URLSearchParams): {
  shopIds: string[]
  excludeIds: string[]
  cartCategories: string[]
} {
  const shopIds: string[] = []
  const excludeIds: string[] = []
  const cartCategories: string[] = []

  const cartParam = searchParams.get('cart')
  if (cartParam) {
    try {
      const parsed = JSON.parse(cartParam) as { shops?: CartShopInput[] }
      for (const entry of parsed.shops ?? []) {
        if (entry.shopId) shopIds.push(entry.shopId)
        excludeIds.push(...(entry.productIds ?? []))
      }
    } catch {
      /* fall through */
    }
  }

  if (shopIds.length === 0) {
    shopIds.push(...(searchParams.get('shopIds')?.split(',').filter(Boolean) ?? []))
  }
  if (excludeIds.length === 0) {
    excludeIds.push(...(searchParams.get('exclude')?.split(',').filter(Boolean) ?? []))
  }

  const categoriesParam = searchParams.get('categories')
  if (categoriesParam) {
    cartCategories.push(...categoriesParam.split(',').filter(Boolean))
  }

  return { shopIds, excludeIds, cartCategories }
}

/** GET /api/products/recommendations?cart={"shops":[{"shopId":"…","productIds":["…"]}]} */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const limit = Math.min(16, Math.max(4, Number(searchParams.get('limit') ?? 10)))
    const { shopIds: rawShopIds, excludeIds, cartCategories } = parseCartQuery(searchParams)

    if (rawShopIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const shops = await prisma.shop.findMany({
      where: {
        OR: rawShopIds.flatMap((id) => [{ id }, { slug: id }]),
        isActive: true,
      },
      select: { id: true, slug: true, name: true, category: true, storeType: true },
    })

    if (shops.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const resolvedShopIds = shops.map((s) => s.id)
    const excludeSet = new Set(excludeIds)

    const cartProducts =
      excludeIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: excludeIds } },
            select: { category: true, name: true },
          })
        : []

    const inferredCategories = [
      ...cartCategories,
      ...cartProducts.map((p) => p.category.toLowerCase()),
      ...shops.map((s) => s.category.toLowerCase()),
    ]

    const relatedTags = new Set<string>()
    for (const cat of inferredCategories) {
      const key = cat.replace(/\s+/g, '').toLowerCase()
      for (const [anchor, tags] of Object.entries(IMPULSE_CATEGORIES)) {
        if (key.includes(anchor)) tags.forEach((t) => relatedTags.add(t))
      }
      relatedTags.add(key)
    }

    const candidates = await prisma.product.findMany({
      where: {
        shopId: { in: resolvedShopIds },
        isAvailable: true,
        stock: { gt: 0 },
        id: { notIn: [...excludeSet] },
      },
      include: {
        shop: { select: { id: true, slug: true, name: true, category: true } },
      },
      take: 48,
    })

    const scored = candidates
      .map((p) => {
        const cat = p.category.toLowerCase()
        const tagMatch = [...relatedTags].some((t) => cat.includes(t) || p.name.toLowerCase().includes(t))
        const impulseBoost = p.price <= 149 ? 30 : p.price <= 299 ? 15 : 0
        const stockBoost = Math.min(p.stock, 20)
        const categoryBoost = tagMatch ? 40 : 0
        const velocityScore = categoryBoost + impulseBoost + stockBoost - p.price * 0.02
        return { product: p, score: velocityScore }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    const data = scored.map(({ product: p }) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      unit: p.unit,
      image: p.image,
      shopId: p.shopId,
      shopSlug: p.shop.slug,
      shopName: p.shop.name,
      category: p.category,
      stock: p.stock,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recommendations failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
