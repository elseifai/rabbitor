/**
 * Public Essentials catalog — customer-facing global master catalog.
 *
 * GET /api/catalog/essentials
 *   ?category=groceries|pharmacy|vegetables|fresh-fish
 *   ?storeType=KIRANA
 *   ?q=search term
 *   ?limit=40
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { StoreType } from '@rabbit/database'
import {
  categorySlugToStoreType,
  essentialsStoreTypesList,
  mapMasterItemToEssentialsProduct,
} from '@/lib/essentials-catalog'

export const dynamic = 'force-dynamic'

const VALID_STORE_TYPES = new Set(essentialsStoreTypesList())

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')?.trim()
    const storeTypeParam = searchParams.get('storeType')?.trim().toUpperCase()
    const q = searchParams.get('q')?.trim()
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 48) || 48))

    let storeTypeFilter: StoreType | undefined
    if (storeTypeParam && VALID_STORE_TYPES.has(storeTypeParam as StoreType)) {
      storeTypeFilter = storeTypeParam as StoreType
    } else if (category) {
      storeTypeFilter = categorySlugToStoreType(category)
    }

    const items = await prisma.masterCatalogItem.findMany({
      where: {
        isActive: true,
        storeType: storeTypeFilter
          ? storeTypeFilter
          : { in: essentialsStoreTypesList() },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
                { subcategory: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ storeType: 'asc' }, { name: 'asc' }],
      take: limit,
    })

    const data = items.map(mapMasterItemToEssentialsProduct)

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total: data.length,
        source: 'global-catalog',
        storeType: storeTypeFilter ?? 'ALL_ESSENTIALS',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load essentials catalog'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
