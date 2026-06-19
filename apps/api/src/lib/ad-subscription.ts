import { prisma } from "./prisma";

export async function getActivePromoShopIds(shopIds: string[]): Promise<Set<string>> {
  if (shopIds.length === 0) return new Set();
  const now = new Date();
  const plans = await prisma.adSubscriptionPlan.findMany({
    where: {
      shopId: { in: shopIds },
      status: "ACTIVE",
      startDate: { lte: now },
      endDate: { gte: now },
      shop: { isActive: true },
    },
    select: { shopId: true },
  });
  return new Set(plans.map((p) => p.shopId).filter(Boolean) as string[]);
}
