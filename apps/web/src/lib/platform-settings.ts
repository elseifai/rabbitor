import { prisma } from '@/lib/prisma'
import { mergeFeatureFlags, type FeatureFlags } from '@/lib/feature-flags'
import { mergeHomeFeedConfig, type HomeFeedConfig } from '@/lib/home-feed-config'
import {
  mergeMerchantLayoutConfig,
  mergeRiderLayoutConfig,
  type MerchantLayoutConfig,
  type RiderLayoutConfig,
} from '@/lib/layout-config'

export type PlatformSettingsData = {
  globalMinCartValue: number
  multiShopRoutingFeePerLeg: number
  freeDeliveryThreshold: number
  surgePricingMultiplier: number
  platformServiceFee: number
  featureFlags: FeatureFlags
  homeFeedConfig: HomeFeedConfig
  merchantLayoutConfig: MerchantLayoutConfig
  riderLayoutConfig: RiderLayoutConfig
}

const DEFAULTS: PlatformSettingsData = {
  globalMinCartValue: 0,
  multiShopRoutingFeePerLeg: 25,
  freeDeliveryThreshold: 499,
  surgePricingMultiplier: 1,
  platformServiceFee: 0,
  featureFlags: mergeFeatureFlags({}),
  homeFeedConfig: mergeHomeFeedConfig({}),
  merchantLayoutConfig: mergeMerchantLayoutConfig({}),
  riderLayoutConfig: mergeRiderLayoutConfig({}),
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
    homeFeedConfig: mergeHomeFeedConfig(row.homeFeedConfig),
    merchantLayoutConfig: mergeMerchantLayoutConfig(row.merchantLayoutConfig),
    riderLayoutConfig: mergeRiderLayoutConfig(row.riderLayoutConfig),
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
    homeFeedConfig: mergeHomeFeedConfig(row.homeFeedConfig),
    merchantLayoutConfig: mergeMerchantLayoutConfig(row.merchantLayoutConfig),
    riderLayoutConfig: mergeRiderLayoutConfig(row.riderLayoutConfig),
  }
}

export async function getHomeFeedConfig(): Promise<HomeFeedConfig> {
  const settings = await getPlatformSettings()
  return settings.homeFeedConfig
}

export async function updateHomeFeedConfig(
  patch: Partial<HomeFeedConfig>,
): Promise<HomeFeedConfig> {
  const current = await getHomeFeedConfig()
  const merged = mergeHomeFeedConfig({ ...current, ...patch })
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...DEFAULTS, homeFeedConfig: merged as object },
    update: { homeFeedConfig: merged as object },
  })
  return merged
}

export async function getMerchantLayoutConfig(): Promise<MerchantLayoutConfig> {
  const settings = await getPlatformSettings()
  return settings.merchantLayoutConfig
}

export async function getRiderLayoutConfig(): Promise<RiderLayoutConfig> {
  const settings = await getPlatformSettings()
  return settings.riderLayoutConfig
}

export async function updateLayoutConfigs(input: {
  merchantLayoutConfig?: Partial<MerchantLayoutConfig>
  riderLayoutConfig?: Partial<RiderLayoutConfig>
}): Promise<{ merchantLayoutConfig: MerchantLayoutConfig; riderLayoutConfig: RiderLayoutConfig }> {
  const current = await getPlatformSettings()
  const merchantLayoutConfig = mergeMerchantLayoutConfig({
    ...current.merchantLayoutConfig,
    ...input.merchantLayoutConfig,
  })
  const riderLayoutConfig = mergeRiderLayoutConfig({
    ...current.riderLayoutConfig,
    ...input.riderLayoutConfig,
  })

  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      ...DEFAULTS,
      merchantLayoutConfig: merchantLayoutConfig as object,
      riderLayoutConfig: riderLayoutConfig as object,
    },
    update: {
      merchantLayoutConfig: merchantLayoutConfig as object,
      riderLayoutConfig: riderLayoutConfig as object,
    },
  })

  return { merchantLayoutConfig, riderLayoutConfig }
}
