-- Merchant & rider no-code layout builder configs
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "merchantLayoutConfig" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "riderLayoutConfig" JSONB NOT NULL DEFAULT '{}';
