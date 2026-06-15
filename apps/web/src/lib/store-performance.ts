export type StorePerformanceTier = 'elite' | 'standard' | 'critical'

const PLATFORM_COMMISSION_RATE = 0.15

export function computeStoreTier(
  handoverMinutes: number,
  fulfillmentRate: number,
): StorePerformanceTier {
  if (handoverMinutes > 10 || fulfillmentRate < 90) return 'critical'
  if (handoverMinutes < 5 && fulfillmentRate > 98) return 'elite'
  if (handoverMinutes <= 10 && fulfillmentRate >= 90 && fulfillmentRate <= 98) return 'standard'
  if (handoverMinutes >= 5 && handoverMinutes <= 10 && fulfillmentRate > 98) return 'standard'
  return 'critical'
}

export function tierMeta(tier: StorePerformanceTier) {
  switch (tier) {
    case 'elite':
      return { label: 'Elite Tier', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
    case 'standard':
      return { label: 'Standard Tier', className: 'bg-sky-50 text-sky-700 ring-sky-200' }
    case 'critical':
      return { label: 'Critical Action', className: 'bg-red-50 text-red-700 ring-red-200' }
  }
}

export function handoverLabel(minutes: number): { text: string; warn: boolean } {
  const rounded = Math.round(minutes * 10) / 10
  if (rounded > 10) return { text: `⚠️ ${rounded} mins`, warn: true }
  if (rounded > 5) return { text: `⚡ ${rounded} mins`, warn: false }
  return { text: `⚡ ${rounded} mins`, warn: false }
}

export function computeHandoverMinutes(
  orders: {
    statusHistory: { status: string; createdAt: Date }[]
  }[],
  fallbackMinutes: number,
): number {
  const samples: number[] = []
  for (const order of orders) {
    const prep = order.statusHistory.find((h) => h.status === 'PREPARING')
    const handover = order.statusHistory.find((h) => h.status === 'OUT_FOR_DELIVERY')
    if (prep && handover) {
      samples.push((handover.createdAt.getTime() - prep.createdAt.getTime()) / 60000)
    }
  }
  if (samples.length === 0) return Math.max(1, fallbackMinutes * 0.7)
  return samples.reduce((a, b) => a + b, 0) / samples.length
}

export function computeFulfillmentRate(delivered: number, cancelled: number): number {
  const total = delivered + cancelled
  if (total === 0) return 100
  return Math.round((delivered / total) * 1000) / 10
}

export function platformCommission(gmv: number): number {
  return Math.round(gmv * PLATFORM_COMMISSION_RATE)
}

export { PLATFORM_COMMISSION_RATE }
