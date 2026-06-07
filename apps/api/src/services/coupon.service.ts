import type { DiscountType } from "@rabbit/database";
import { prisma } from "../lib/prisma";
import { badRequest, notFound } from "../lib/errors";

function computeDiscount(
  discountType: DiscountType,
  discountValue: number,
  cartTotal: number
): number {
  if (discountType === "FLAT") {
    return Math.min(discountValue, cartTotal);
  }
  return Math.min(cartTotal, (cartTotal * discountValue) / 100);
}

export async function validateCoupon(code: string, cartTotal: number) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw badRequest("Invalid or inactive coupon code", "INVALID_COUPON");
  }

  if (coupon.expiresAt && coupon.expiresAt <= new Date()) {
    throw badRequest("This coupon has expired", "COUPON_EXPIRED");
  }

  if (coupon.usedCount >= coupon.maxUses) {
    throw badRequest("This coupon has reached its usage limit", "COUPON_EXHAUSTED");
  }

  if (cartTotal < coupon.minOrderValue) {
    throw badRequest(
      `Minimum order value of ₹${coupon.minOrderValue} required`,
      "MIN_ORDER_NOT_MET"
    );
  }

  const discountAmount = computeDiscount(coupon.discountType, coupon.discountValue, cartTotal);
  const finalTotal = Math.max(0, cartTotal - discountAmount);

  return {
    valid: true as const,
    code: coupon.code,
    discountAmount,
    finalTotal,
  };
}

export async function applyCouponInTransaction(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  couponCode: string,
  cartTotal: number
) {
  const coupon = await tx.coupon.findUnique({
    where: { code: couponCode.trim().toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw badRequest("Invalid or inactive coupon code", "INVALID_COUPON");
  }

  if (coupon.expiresAt && coupon.expiresAt <= new Date()) {
    throw badRequest("This coupon has expired", "COUPON_EXPIRED");
  }

  if (coupon.usedCount >= coupon.maxUses) {
    throw badRequest("This coupon has reached its usage limit", "COUPON_EXHAUSTED");
  }

  if (cartTotal < coupon.minOrderValue) {
    throw badRequest(
      `Minimum order value of ₹${coupon.minOrderValue} required`,
      "MIN_ORDER_NOT_MET"
    );
  }

  const discountAmount = computeDiscount(coupon.discountType, coupon.discountValue, cartTotal);

  await tx.coupon.update({
    where: { id: coupon.id },
    data: { usedCount: { increment: 1 } },
  });

  return {
    appliedCouponCode: coupon.code,
    discountAmount,
  };
}

export async function createCoupon(input: {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxUses?: number;
  expiresAt?: string | null;
  isActive?: boolean;
}) {
  return prisma.coupon.create({
    data: {
      code: input.code.trim().toUpperCase(),
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderValue: input.minOrderValue ?? 0,
      maxUses: input.maxUses ?? 100,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function listCoupons() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return coupons.map((c) => ({
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discountValue: c.discountValue,
    minOrderValue: c.minOrderValue,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    remainingUses: Math.max(0, c.maxUses - c.usedCount),
    expiresAt: c.expiresAt?.toISOString() ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function getCouponByCode(code: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (!coupon) throw notFound("Coupon not found");
  return coupon;
}
