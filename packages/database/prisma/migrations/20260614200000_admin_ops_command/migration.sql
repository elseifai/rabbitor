-- AlterTable MasterCatalogItem (global catalog product baseline)
ALTER TABLE "MasterCatalogItem" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "MasterCatalogItem" ADD COLUMN IF NOT EXISTS "subcategory" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "MasterCatalogItem_sku_key" ON "MasterCatalogItem"("sku");

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "masterCatalogItemId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "maxPurchaseQty" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "binLocation" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_masterCatalogItemId_fkey" FOREIGN KEY ("masterCatalogItemId") REFERENCES "MasterCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Shop
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "packingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable PlatformSettings
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "featureFlags" JSONB NOT NULL DEFAULT '{}';
