/** +50 priority boost multiplier for stores with an ACTIVE ad subscription plan */
export const PROMO_SEARCH_BOOST = 50

export function effectiveSortDistance(distanceKm: number, hasActivePromo: boolean): number {
  if (!hasActivePromo) return distanceKm
  return distanceKm / (1 + PROMO_SEARCH_BOOST / 100)
}

export function searchWeightFromDistance(distanceKm: number, hasActivePromo: boolean): number {
  const base = Math.max(0, 100 - distanceKm * 10)
  return hasActivePromo ? base + PROMO_SEARCH_BOOST : base
}
