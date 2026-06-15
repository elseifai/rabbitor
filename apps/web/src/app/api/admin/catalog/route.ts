import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { StoreType } from '@rabbit/database'
import {
  assignVelocityBadges,
  computePositiveFeedbackPercent,
} from '@/lib/catalog-performance'
import { aggregateCatalogMetrics } from '@/lib/master-catalog-metrics'

export async function GET(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim().toLowerCase()
    const category = searchParams.get('category')?.trim()
    const storeType = searchParams.get('storeType') as StoreType | null

    const [items, metrics] = await Promise.all([
      prisma.masterCatalogItem.findMany({
        where: {
          isActive: true,
          ...(storeType ? { storeType } : {}),
          ...(category ? { category: { contains: category, mode: 'insensitive' } } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { sku: { contains: q, mode: 'insensitive' } },
                  { category: { contains: q, mode: 'insensitive' } },
                  { subcategory: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
      aggregateCatalogMetrics(),
    ])

    const velocityInput = items.map((item) => ({
      id: item.id,
      lifetimeOrdersCount: metrics.ordersCount.get(item.id) ?? 0,
    }))
    const badges = assignVelocityBadges(velocityInput)

    const enriched = items
      .map((item) => {
        const lifetimeOrdersCount = metrics.ordersCount.get(item.id) ?? 0
        const lifetimeRevenue = Math.round(metrics.revenue.get(item.id) ?? 0)
        const ratings = metrics.ratingsByCatalog.get(item.id) ?? []
        const badge = badges.get(item.id)
        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description,
          itemType: item.itemType,
          category: item.category,
          subcategory: item.subcategory,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          storeType: item.storeType,
          defaultUnit: item.defaultUnit,
          lifetimeOrdersCount,
          lifetimeRevenue,
          customerFeedbackPositivePercent: computePositiveFeedbackPercent(ratings),
          velocityRank: badge?.velocityRank ?? 999,
          velocityBadge: badge?.velocityBadge ?? 'low',
          velocityLabel: badge?.velocityLabel ?? '⚠️ Low Demand',
        }
      })
      .sort((a, b) => a.velocityRank - b.velocityRank)

    return NextResponse.json({
      success: true,
      data: enriched,
      summary: {
        total: enriched.length,
        highVelocity: enriched.filter((i) => i.velocityBadge === 'high').length,
        lowDemand: enriched.filter((i) => i.velocityBadge === 'low').length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
