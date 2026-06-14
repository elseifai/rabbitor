import { prisma } from '@/lib/prisma'

export type PlatformSettingsData = {
  globalMinCartValue: number
  multiShopRoutingFeePerLeg: number
  freeDeliveryThreshold: number
}

const DEFAULTS: PlatformSettingsData = {
  globalMinCartValue: 0,
  multiShopRoutingFeePerLeg: 25,
  freeDeliveryThreshold: 499,
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
  }
}

export async function updatePlatformSettings(
  input: Partial<PlatformSettingsData>,
): Promise<PlatformSettingsData> {
  const row = await prisma.platformSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...DEFAULTS, ...input },
    update: input,
  })
  return {
    globalMinCartValue: row.globalMinCartValue,
    multiShopRoutingFeePerLeg: row.multiShopRoutingFeePerLeg,
    freeDeliveryThreshold: row.freeDeliveryThreshold,
  }
}
