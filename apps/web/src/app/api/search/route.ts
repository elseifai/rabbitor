import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// LIVE ECOSYSTEM UPGRADE — global product + shop search
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() ?? ''

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, query: q, products: [], shops: [] })
    }

    const [products, shops] = await Promise.all([
      prisma.product.findMany({
        where: {
          isAvailable: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { unit: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 40,
        orderBy: { createdAt: 'desc' },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              storeType: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.shop.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({
      success: true,
      query: q,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        mrp: p.mrp,
        unit: p.unit,
        image: p.image,
        stock: p.stock,
        storeId: p.shop.id,
        storeName: p.shop.name,
        shopSlug: p.shop.slug,
        storeType: p.shop.storeType,
      })),
      shops: shops.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        category: s.category,
        image: s.image,
        storeType: s.storeType,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
