-- CreateEnum
CREATE TYPE "AdSubscriptionPlanType" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "AdSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AdSettlementMethod" AS ENUM ('EXTERNAL_PAYMENT', 'PAYOUT_DEDUCTION');

-- AlterTable
ALTER TABLE "Ad" ADD COLUMN "pausedByKillSwitch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ad" ADD COLUMN "uniqueClicks" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdUniqueClick" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdUniqueClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSubscriptionPlan" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "shopId" TEXT,
    "planType" "AdSubscriptionPlanType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "tierLevel" INTEGER NOT NULL DEFAULT 1,
    "pricePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "AdSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "pausedByKillSwitch" BOOLEAN NOT NULL DEFAULT false,
    "settlementMethod" "AdSettlementMethod",
    "settlementRef" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdUniqueClick_adId_visitorId_key" ON "AdUniqueClick"("adId", "visitorId");

-- CreateIndex
CREATE INDEX "AdUniqueClick_adId_idx" ON "AdUniqueClick"("adId");

-- CreateIndex
CREATE INDEX "AdSubscriptionPlan_merchantId_status_idx" ON "AdSubscriptionPlan"("merchantId", "status");

-- CreateIndex
CREATE INDEX "AdSubscriptionPlan_shopId_status_idx" ON "AdSubscriptionPlan"("shopId", "status");

-- CreateIndex
CREATE INDEX "AdSubscriptionPlan_status_endDate_idx" ON "AdSubscriptionPlan"("status", "endDate");

-- AddForeignKey
ALTER TABLE "AdUniqueClick" ADD CONSTRAINT "AdUniqueClick_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSubscriptionPlan" ADD CONSTRAINT "AdSubscriptionPlan_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSubscriptionPlan" ADD CONSTRAINT "AdSubscriptionPlan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
