-- Google SSO + auth fields — sync User model and EmailVerification with Prisma schema

-- User: optional phone (OTP/Google users may have email only)
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

-- User: Google OAuth + profile fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fcmToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLatitude" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLongitude" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "savedAddress" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

-- Email OTP + magic-link challenges
CREATE TABLE IF NOT EXISTS "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerification_token_key" ON "EmailVerification"("token");
CREATE INDEX IF NOT EXISTS "EmailVerification_email_expiresAt_idx" ON "EmailVerification"("email", "expiresAt");
