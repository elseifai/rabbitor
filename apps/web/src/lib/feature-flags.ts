export type FeatureFlags = {
  customer: {
    razorpayEnabled: boolean
    codEnabled: boolean
    multiStoreCart: boolean
    promoBannerEnabled: boolean
  }
  merchant: {
    uniformPrepMinutes: number | null
    autoAcceptOrders: boolean
  }
  rider: {
    minRoutingFeePerLeg: number
    gpsPingIntervalSec: number
  }
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  customer: {
    razorpayEnabled: true,
    codEnabled: true,
    multiStoreCart: true,
    promoBannerEnabled: true,
  },
  merchant: {
    uniformPrepMinutes: null,
    autoAcceptOrders: false,
  },
  rider: {
    minRoutingFeePerLeg: 25,
    gpsPingIntervalSec: 8,
  },
}

export function mergeFeatureFlags(raw: unknown): FeatureFlags {
  const base = structuredClone(DEFAULT_FEATURE_FLAGS)
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Partial<FeatureFlags>
  if (obj.customer && typeof obj.customer === 'object') {
    Object.assign(base.customer, obj.customer)
  }
  if (obj.merchant && typeof obj.merchant === 'object') {
    Object.assign(base.merchant, obj.merchant)
  }
  if (obj.rider && typeof obj.rider === 'object') {
    Object.assign(base.rider, obj.rider)
  }
  return base
}
