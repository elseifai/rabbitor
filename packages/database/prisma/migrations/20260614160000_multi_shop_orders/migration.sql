-- CreateEnum (idempotent for re-runs)
DO $$ BEGIN
  CREATE TYPE "OrderKind" AS ENUM ('STANDARD', 'PARENT', 'CHILD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "globalMinCartValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "multiShopRoutingFeePerLeg" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "freeDeliveryThreshold" DOUBLE PRECISION NOT NULL DEFAULT 499,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "orderKind" "OrderKind" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "parentOrderId" TEXT;

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN "isMultiShop" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shopsJson" JSONB;

-- CreateIndex
CREATE INDEX "Order_parentOrderId_idx" ON "Order"("parentOrderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default platform settings
INSERT INTO "PlatformSettings" ("id", "globalMinCartValue", "multiShopRoutingFeePerLeg", "freeDeliveryThreshold", "updatedAt")
VALUES ('default', 0, 25, 499, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Upsert ₹1 sandbox test product on Sharma Kirana when present
INSERT INTO "Product" ("id", "shopId", "name", "description", "price", "mrp", "unit", "stock", "isAvailable", "category", "createdAt", "updatedAt")
SELECT
  s.id || '-sandbox-test',
  s.id,
  'Testing Sandbox Product',
  '₹1 Razorpay checkout test item',
  1,
  5,
  'piece',
  999,
  true,
  'general',
  NOW(),
  NOW()
FROM "Shop" s
WHERE s.slug = 'sharma-kirana'
ON CONFLICT ("id") DO UPDATE SET
  "price" = 1,
  "stock" = 999,
  "isAvailable" = true,
  "updatedAt" = NOW();
