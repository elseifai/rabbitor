export type AdRecord = {
  id: string
  title: string
  imageUrl: string
  linkUrl: string | null
  placement: string
  isActive: boolean
  startDate: string
  endDate: string | null
  impressions: number
  clicks: number
  targetShopIds?: unknown
  targetZones?: unknown
  targetSegments?: unknown
}

export type AdLifecycleStatus = 'live' | 'scheduled' | 'expired' | 'inactive'

export function getAdLifecycleStatus(ad: {
  isActive: boolean
  startDate: string | Date
  endDate?: string | Date | null
}): AdLifecycleStatus {
  const now = Date.now()
  const start = new Date(ad.startDate).getTime()
  const end = ad.endDate ? new Date(ad.endDate).getTime() : null

  if (!ad.isActive) return 'inactive'
  if (end != null && end < now) return 'expired'
  if (start > now) return 'scheduled'
  return 'live'
}

export function computeAdCtr(impressions: number, clicks: number): number {
  if (impressions <= 0) return 0
  return Math.round((clicks / impressions) * 10000) / 100
}

export function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  return []
}
