-- CreateEnum
CREATE TYPE "RiderVehicleType" AS ENUM ('BIKE', 'SCOOTER', 'CYCLE');

-- AlterTable
ALTER TABLE "RabbitorProfile" ADD COLUMN "isOnboarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RabbitorProfile" ADD COLUMN "fullName" TEXT;
ALTER TABLE "RabbitorProfile" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "RabbitorProfile" ADD COLUMN "emergencyPhone" TEXT;
ALTER TABLE "RabbitorProfile" ADD COLUMN "vehicleType" "RiderVehicleType";
ALTER TABLE "RabbitorProfile" ADD COLUMN "vehiclePlate" TEXT;
ALTER TABLE "RabbitorProfile" ADD COLUMN "drivingLicenseId" TEXT;
ALTER TABLE "RabbitorProfile" ADD COLUMN "bankName" TEXT;
ALTER TABLE "RabbitorProfile" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "RabbitorProfile" ADD COLUMN "ifscCode" TEXT;
