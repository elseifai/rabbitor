-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CatalogItemType" AS ENUM ('VEG', 'NON_VEG', 'EGG', 'SHORT_SHELF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "MasterCatalogItem" ADD COLUMN IF NOT EXISTS "itemType" "CatalogItemType" NOT NULL DEFAULT 'VEG';
CREATE INDEX IF NOT EXISTS "MasterCatalogItem_itemType_idx" ON "MasterCatalogItem"("itemType");
