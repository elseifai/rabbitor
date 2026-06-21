import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** GET /api/admin/categories/insights?slug=kirana */
export async function GET(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const slug = new URL(request.url).searchParams.get('slug')?.trim().toLowerCase()
    if (!slug) {
      return NextResponse.json({ success: false, error: 'slug query param required' }, { status: 400 })
    }

    const items = await prisma.masterCatalogItem.findMany({
      where: {
        isActive: true,
        OR: [{ segmentSlug: slug }, { subcategory: slug }],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        storeType: true,
        segmentSlug: true,
        subcategory: true,
        basePrice: true,
        imageUrl: true,
      },
      orderBy: { name: 'asc' },
      take: 200,
    })

    const shopProductCount = await prisma.product.count({
      where: {
        isAvailable: true,
        OR: [
          { category: slug },
          { masterCatalogItem: { segmentSlug: slug } },
          { masterCatalogItem: { subcategory: slug } },
        ],
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        slug,
        masterCatalogCount: items.length,
        shopProductCount,
        items,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Access denied'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }
}
