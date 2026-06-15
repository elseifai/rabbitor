import type { CatalogItemType } from '@rabbit/database'

export type CatalogVelocityBadge = 'high' | 'essential' | 'low'

export type CatalogItemMetrics = {
  lifetimeOrdersCount: number
  lifetimeRevenue: number
  customerFeedbackPositivePercent: number
  velocityRank: number
  velocityBadge: CatalogVelocityBadge
  velocityLabel: string
}

export function computePositiveFeedbackPercent(ratings: number[]): number {
  if (ratings.length === 0) return 100
  const positive = ratings.filter((r) => r >= 4).length
  return Math.round((positive / ratings.length) * 1000) / 10
}

export function parseCatalogItemType(raw: string | null | undefined): CatalogItemType {
  const v = (raw ?? 'VEG').toUpperCase().replace(/[\s-]+/g, '_')
  if (v === 'NON_VEG' || v === 'NONVEG') return 'NON_VEG'
  if (v === 'EGG' || v === 'EGGS') return 'EGG'
  if (v === 'SHORT_SHELF' || v === 'SHORTSHELF') return 'SHORT_SHELF'
  return 'VEG'
}

export function itemTypeLabel(type: CatalogItemType): string {
  switch (type) {
    case 'NON_VEG':
      return 'Non-Veg'
    case 'EGG':
      return 'Egg'
    case 'SHORT_SHELF':
      return 'Short-Shelf'
    default:
      return 'Veg'
  }
}

export function itemTypeBadgeClass(type: CatalogItemType): string {
  switch (type) {
    case 'NON_VEG':
      return 'bg-red-50 text-red-700 ring-red-200'
    case 'EGG':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'SHORT_SHELF':
      return 'bg-purple-50 text-purple-700 ring-purple-200'
    default:
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  }
}

export function assignVelocityBadges(
  items: { id: string; lifetimeOrdersCount: number }[],
): Map<string, Pick<CatalogItemMetrics, 'velocityRank' | 'velocityBadge' | 'velocityLabel'>> {
  const sorted = [...items].sort((a, b) => b.lifetimeOrdersCount - a.lifetimeOrdersCount)
  const orderCounts = sorted.map((s) => s.lifetimeOrdersCount).filter((c) => c > 0)
  const median =
    orderCounts.length > 0
      ? orderCounts[Math.floor(orderCounts.length / 2)] ?? 0
      : 0

  const map = new Map<string, Pick<CatalogItemMetrics, 'velocityRank' | 'velocityBadge' | 'velocityLabel'>>()

  sorted.forEach((item, index) => {
    const rank = index + 1
    if (item.lifetimeOrdersCount > 0 && rank <= 10) {
      map.set(item.id, {
        velocityRank: rank,
        velocityBadge: 'high',
        velocityLabel: `🏆 Rank #${rank} (High Velocity)`,
      })
    } else if (item.lifetimeOrdersCount >= Math.max(3, median)) {
      map.set(item.id, {
        velocityRank: rank,
        velocityBadge: 'essential',
        velocityLabel: '📦 Essential Mover',
      })
    } else {
      map.set(item.id, {
        velocityRank: rank,
        velocityBadge: 'low',
        velocityLabel: '⚠️ Low Demand',
      })
    }
  })

  return map
}

export function velocityBadgeClass(badge: CatalogVelocityBadge): string {
  switch (badge) {
    case 'high':
      return 'bg-yellow-50 text-yellow-800 ring-yellow-200'
    case 'essential':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
}
