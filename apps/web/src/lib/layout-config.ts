export type MerchantBanner = {
  id: string
  title: string
  subtitle: string
  image: string | null
  ctaLabel: string
  ctaRoute: string
  active: boolean
  sortOrder: number
}

export type MerchantPerformanceWarning = {
  id: string
  metric: 'prep_delay' | 'cancellation_rate' | 'rating_drop' | 'stock_out'
  label: string
  threshold: number
  severity: 'info' | 'warning' | 'critical'
  message: string
  active: boolean
}

export type MerchantNotice = {
  id: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical'
  active: boolean
  expiresAt: string | null
}

export type MerchantLayoutConfig = {
  banners: MerchantBanner[]
  performanceWarnings: MerchantPerformanceWarning[]
  notices: MerchantNotice[]
}

export type RiderOnboardingRequirement = {
  id: string
  label: string
  description: string
  required: boolean
  sortOrder: number
}

export type RiderPayoutTier = {
  id: string
  region: string
  minDeliveries: number
  bonusAmount: number
  label: string
  active: boolean
}

export type RiderAnnouncement = {
  id: string
  title: string
  body: string
  priority: 'normal' | 'high' | 'urgent'
  active: boolean
  expiresAt: string | null
}

export type RiderLayoutConfig = {
  onboardingRequirements: RiderOnboardingRequirement[]
  payoutTiers: RiderPayoutTier[]
  announcements: RiderAnnouncement[]
}

export const DEFAULT_MERCHANT_LAYOUT_CONFIG: MerchantLayoutConfig = {
  banners: [
    {
      id: 'mb-default-1',
      title: 'Grow with Rabbit Ads',
      subtitle: 'Boost visibility in your delivery zone',
      image: null,
      ctaLabel: 'Explore plans',
      ctaRoute: '/merchant/ads',
      active: true,
      sortOrder: 0,
    },
  ],
  performanceWarnings: [
    {
      id: 'mw-prep',
      metric: 'prep_delay',
      label: 'Prep delay alert',
      threshold: 20,
      severity: 'warning',
      message: 'Average prep time exceeds {threshold} minutes — review kitchen workflow.',
      active: true,
    },
    {
      id: 'mw-cancel',
      metric: 'cancellation_rate',
      label: 'Cancellation spike',
      threshold: 8,
      severity: 'critical',
      message: 'Cancellation rate above {threshold}% in the last 24 hours.',
      active: true,
    },
  ],
  notices: [],
}

export const DEFAULT_RIDER_LAYOUT_CONFIG: RiderLayoutConfig = {
  onboardingRequirements: [
    {
      id: 'ro-license',
      label: 'Valid driving license',
      description: 'Upload a clear photo of your driving license (front & back).',
      required: true,
      sortOrder: 0,
    },
    {
      id: 'ro-bank',
      label: 'Bank account details',
      description: 'IFSC-linked account for weekly payout settlements.',
      required: true,
      sortOrder: 1,
    },
    {
      id: 'ro-vehicle',
      label: 'Vehicle registration',
      description: 'RC book or rental agreement for your delivery vehicle.',
      required: true,
      sortOrder: 2,
    },
  ],
  payoutTiers: [
    {
      id: 'rp-tier-1',
      region: 'Default',
      minDeliveries: 10,
      bonusAmount: 150,
      label: 'Starter bonus',
      active: true,
    },
    {
      id: 'rp-tier-2',
      region: 'Default',
      minDeliveries: 30,
      bonusAmount: 400,
      label: 'Pro rider bonus',
      active: true,
    },
  ],
  announcements: [],
}

function mergeArray<T>(base: T[], patch?: T[]): T[] {
  return patch?.length ? patch : base
}

export function mergeMerchantLayoutConfig(raw: unknown): MerchantLayoutConfig {
  const patch = (raw && typeof raw === 'object' ? raw : {}) as Partial<MerchantLayoutConfig>
  return {
    banners: mergeArray(DEFAULT_MERCHANT_LAYOUT_CONFIG.banners, patch.banners),
    performanceWarnings: mergeArray(
      DEFAULT_MERCHANT_LAYOUT_CONFIG.performanceWarnings,
      patch.performanceWarnings,
    ),
    notices: mergeArray(DEFAULT_MERCHANT_LAYOUT_CONFIG.notices, patch.notices),
  }
}

export function mergeRiderLayoutConfig(raw: unknown): RiderLayoutConfig {
  const patch = (raw && typeof raw === 'object' ? raw : {}) as Partial<RiderLayoutConfig>
  return {
    onboardingRequirements: mergeArray(
      DEFAULT_RIDER_LAYOUT_CONFIG.onboardingRequirements,
      patch.onboardingRequirements,
    ),
    payoutTiers: mergeArray(DEFAULT_RIDER_LAYOUT_CONFIG.payoutTiers, patch.payoutTiers),
    announcements: mergeArray(DEFAULT_RIDER_LAYOUT_CONFIG.announcements, patch.announcements),
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
