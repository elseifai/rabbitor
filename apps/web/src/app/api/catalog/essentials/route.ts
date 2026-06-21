/**
 * Public Essentials catalog — customer-facing global master catalog.
 *
 * GET /api/catalog/essentials
 *   ?category=veggies|atta-rice-oil-dals|meat-fish-eggs|frozen-food|…
 *   ?q=search term
 *   ?limit=40
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  buildEssentialsBroadWhere,
  dedupeEssentialsCatalogProducts,
  filterEssentialsByCategorySlug,
  mapMasterItemToEssentialsProduct,
} from '@/lib/essentials-catalog'
import { normalizeCategorySlug } from '@/lib/category-routing'
import {
  normalizeCatalogSegmentSlug,
  segmentLabel,
} from '@/lib/essentials-catalog-segments'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const category = url.searchParams.get('category')?.trim() ?? null
    const q = url.searchParams.get('q')?.trim()
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 48) || 48))

    const where = buildEssentialsBroadWhere(q)

    const items = await prisma.masterCatalogItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 2000,
    })

    const mapped = items.map(mapMasterItemToEssentialsProduct)
    const filtered = category
      ? filterEssentialsByCategorySlug(mapped, category)
      : mapped
    const data = dedupeEssentialsCatalogProducts(filtered).slice(0, limit)

    const categorySlug = category ? normalizeCategorySlug(category) : null
    const segment = categorySlug ? normalizeCatalogSegmentSlug(categorySlug) : null

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total: data.length,
        source: 'global-catalog',
        category: categorySlug ?? 'ALL_ESSENTIALS',
        segment: segment ?? 'ALL_ESSENTIALS',
        segmentLabel: segment ? segmentLabel(segment) : 'All Essentials',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load essentials catalog'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
