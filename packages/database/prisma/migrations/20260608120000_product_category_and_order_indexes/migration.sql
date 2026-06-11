-- Product menu category for cache-scoped feeds
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general';

-- Drop single-column rider index in favor of composite (deliveryPartnerId, status)
DROP INDEX IF EXISTS "Order_deliveryPartnerId_idx";

-- Composite indexes for merchant / rider dashboards and category grids
CREATE INDEX IF NOT EXISTS "Product_shopId_category_idx" ON "Product"("shopId", "category");
CREATE INDEX IF NOT EXISTS "Order_deliveryPartnerId_status_idx" ON "Order"("deliveryPartnerId", "status");
