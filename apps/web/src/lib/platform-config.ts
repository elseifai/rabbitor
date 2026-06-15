import { prisma } from '@/lib/prisma'
import { getPlatformSettings } from '@/lib/platform-settings'
import { mergeFeatureFlags, type FeatureFlags } from '@/lib/feature-flags'

export async function getRuntimePlatformConfig(): Promise<{
  checkout: Awaited<ReturnType<typeof getPlatformSettings>>
  features: FeatureFlags
}> {
  const checkout = await getPlatformSettings()
  const row = await prisma.platformSettings.findUnique({ where: { id: 'default' } })
  const features = mergeFeatureFlags(row?.featureFlags)
  return { checkout, features }
}

export async function updateFeatureFlags(input: Partial<FeatureFlags>): Promise<FeatureFlags> {
  const current = await getRuntimePlatformConfig()
  const next: FeatureFlags = {
    customer: { ...current.features.customer, ...input.customer },
    merchant: { ...current.features.merchant, ...input.merchant },
    rider: { ...current.features.rider, ...input.rider },
  }
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', featureFlags: next },
    update: { featureFlags: next },
  })
  return next
}
