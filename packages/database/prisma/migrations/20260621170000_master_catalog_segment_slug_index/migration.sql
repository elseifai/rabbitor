-- Rename category → segment_slug and add composite index for Essentials browse queries
ALTER TABLE "MasterCatalogItem" RENAME COLUMN "category" TO "segment_slug";

DROP INDEX IF EXISTS "MasterCatalogItem_category_idx";

CREATE INDEX "MasterCatalogItem_segment_slug_isActive_idx" ON "MasterCatalogItem"("segment_slug", "isActive");
