import type { AdSettlementMethod, AdSubscriptionPlanType } from '@rabbit/database'
import { prisma } from '@/lib/prisma'
import { orderGrandTotal } from '@/lib/order-totals'
import { platformCommission } from '@/lib/store-performance'

const PLAN_DURATION_DAYS: Record<AdSubscriptionPlanType, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  YEARLY: 365,
}

export function planEndDate(start: Date, planType: AdSubscriptionPlanType): Date {
  const end = new Date(start)
  end.setDate(end.getDate() + PLAN_DURATION_DAYS[planType])
  return end
}

export async function getActivePromoShopIds(shopIds: string[]): Promise<Set<string>> {
  if (shopIds.length === 0) return new Set()
  const now = new Date()
  const plans = await prisma.adSubscriptionPlan.findMany({
    where: {
      shopId: { in: shopIds },
      status: 'ACTIVE',
      startDate: { lte: now },
      endDate: { gte: now },
      shop: { isActive: true },
    },
    select: { shopId: true },
  })
  return new Set(plans.map((p) => p.shopId).filter(Boolean) as string[])
}

export async function computeShopOutstandingPayout(shopId: string): Promise<number> {
  const delivered = await prisma.order.findMany({
    where: { shopId, status: 'DELIVERED' },
    select: { totalPrice: true, deliveryFee: true, riderTip: true },
  })
  const gmv = delivered.reduce((s, o) => s + orderGrandTotal(o), 0)
  return Math.round(gmv - platformCommission(gmv))
}

export async function settleAdSubscriptionPlan(
  planId: string,
  method: AdSettlementMethod,
  settlementRef?: string,
) {
  const plan = await prisma.adSubscriptionPlan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error('Subscription plan not found')
  if (plan.settledAt) throw new Error('Plan already settled')

  if (method === 'PAYOUT_DEDUCTION') {
    if (!plan.shopId) throw new Error('Shop required for payout deduction')
    const outstanding = await computeShopOutstandingPayout(plan.shopId)
    if (outstanding < plan.pricePaid) {
      throw new Error(
        `Insufficient payout balance (₹${outstanding} available, ₹${plan.pricePaid} required)`,
      )
    }
  }

  return prisma.adSubscriptionPlan.update({
    where: { id: planId },
    data: {
      settlementMethod: method,
      settlementRef: settlementRef?.trim() || null,
      settledAt: new Date(),
      status: 'ACTIVE',
    },
    include: {
      merchant: { select: { businessName: true } },
      shop: { select: { id: true, name: true } },
    },
  })
}
