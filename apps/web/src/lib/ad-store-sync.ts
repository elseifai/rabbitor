import { prisma } from '@/lib/prisma'

/**
 * When a store closes (kill switch), pause ad visibility and subscription plans.
 * When it reopens, restore only items that were paused by the kill switch.
 */
export async function syncAdsWithStoreStatus(shopId: string, isOpen: boolean) {
  if (!isOpen) {
    await prisma.$transaction([
      prisma.ad.updateMany({
        where: { shopId, isActive: true },
        data: { isActive: false, pausedByKillSwitch: true },
      }),
      prisma.adSubscriptionPlan.updateMany({
        where: { shopId, status: 'ACTIVE' },
        data: { status: 'PAUSED', pausedByKillSwitch: true },
      }),
    ])
    return
  }

  await prisma.$transaction([
    prisma.ad.updateMany({
      where: { shopId, pausedByKillSwitch: true },
      data: { isActive: true, pausedByKillSwitch: false },
    }),
    prisma.adSubscriptionPlan.updateMany({
      where: { shopId, pausedByKillSwitch: true, status: 'PAUSED' },
      data: { status: 'ACTIVE', pausedByKillSwitch: false },
    }),
  ])
}
