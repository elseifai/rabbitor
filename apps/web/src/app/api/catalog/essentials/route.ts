/**
 * Public Essentials catalog — customer-facing global master catalog.
 *
 * GET /api/catalog/essentials
 *   ?category=kirana|veggies|pharmacy|fish|meat|dairy
 *   ?q=search term
 *   ?limit=40
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  buildEssentialsCategoryWhere,
  categorySlugToStoreType,
  dedupeEssentialsCatalogProducts,
  mapMasterItemToEssentialsProduct,
} from '@/lib/essentials-catalog'
import { normalizeCategorySlug } from '@/lib/category-routing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const category = url.searchParams.get('category')?.trim() ?? null
    const q = url.searchParams.get('q')?.trim()
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 48) || 48))

    const where = buildEssentialsCategoryWhere(category, q)

    const items = await prisma.masterCatalogItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: limit * 2,
    })

    const mapped = items.map(mapMasterItemToEssentialsProduct)
    const data = dedupeEssentialsCatalogProducts(mapped).slice(0, limit)

    const categorySlug = category ? normalizeCategorySlug(category) : null

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total: data.length,
        source: 'global-catalog',
        category: categorySlug ?? 'ALL_ESSENTIALS',
        storeType: categorySlug ? (categorySlugToStoreType(categorySlug) ?? categorySlug) : 'ALL_ESSENTIALS',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load essentials catalog'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
