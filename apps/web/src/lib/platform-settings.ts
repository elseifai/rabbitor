import { prisma } from '@/lib/prisma'
import { mergeFeatureFlags, type FeatureFlags } from '@/lib/feature-flags'

export type PlatformSettingsData = {
  globalMinCartValue: number
  multiShopRoutingFeePerLeg: number
  freeDeliveryThreshold: number
  surgePricingMultiplier: number
  platformServiceFee: number
  featureFlags: FeatureFlags
}

const DEFAULTS: PlatformSettingsData = {
  globalMinCartValue: 0,
  multiShopRoutingFeePerLeg: 25,
  freeDeliveryThreshold: 499,
  surgePricingMultiplier: 1,
  platformServiceFee: 0,
  featureFlags: mergeFeatureFlags({}),
}

export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  const row = await prisma.platformSettings.findUnique({ where: { id: 'default' } })
  if (!row) {
    await prisma.platformSettings.create({
      data: { id: 'default', ...DEFAULTS },
    })
    return DEFAULTS
  }
  return {
    globalMinCartValue: row.globalMinCartValue,
    multiShopRoutingFeePerLeg: row.multiShopRoutingFeePerLeg,
    freeDeliveryThreshold: row.freeDeliveryThreshold,
    surgePricingMultiplier: row.surgePricingMultiplier,
    platformServiceFee: row.platformServiceFee,
    featureFlags: mergeFeatureFlags(row.featureFlags),
  }
}

export async function updatePlatformSettings(
  input: Partial<Omit<PlatformSettingsData, 'featureFlags'>> & {
    featureFlags?: Partial<PlatformSettingsData['featureFlags']>
  },
): Promise<PlatformSettingsData> {
  const current = await getPlatformSettings()
  const featureFlags = input.featureFlags
    ? {
        customer: { ...current.featureFlags.customer, ...input.featureFlags.customer },
        merchant: { ...current.featureFlags.merchant, ...input.featureFlags.merchant },
        rider: { ...current.featureFlags.rider, ...input.featureFlags.rider },
      }
    : current.featureFlags

  const row = await prisma.platformSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      ...DEFAULTS,
      ...input,
      featureFlags,
    },
    update: {
      ...input,
      featureFlags,
    },
  })
  return {
    globalMinCartValue: row.globalMinCartValue,
    multiShopRoutingFeePerLeg: row.multiShopRoutingFeePerLeg,
    freeDeliveryThreshold: row.freeDeliveryThreshold,
    surgePricingMultiplier: row.surgePricingMultiplier,
    platformServiceFee: row.platformServiceFee,
    featureFlags: mergeFeatureFlags(row.featureFlags),
  }
}
