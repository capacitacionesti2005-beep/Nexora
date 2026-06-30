-- CreateEnum
CREATE TYPE "TransportComponentCondition" AS ENUM ('GOOD', 'WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "TransportVehicle" ADD COLUMN     "bodyType" TEXT NOT NULL DEFAULT 'Furgon',
ADD COLUMN     "hasLiftGate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refrigerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trailerType" TEXT,
ADD COLUMN     "vehicleClass" TEXT NOT NULL DEFAULT 'TRUCK',
ADD COLUMN     "wheelCount" INTEGER NOT NULL DEFAULT 6;

-- CreateTable
CREATE TABLE "TransportVehicleComponent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "componentKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "side" TEXT,
    "condition" "TransportComponentCondition" NOT NULL DEFAULT 'GOOD',
    "currentValue" TEXT,
    "threshold" TEXT,
    "nextAction" TEXT,
    "x" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "y" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "view" TEXT NOT NULL DEFAULT 'diagonal',
    "lastCheckedAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "nextDueKm" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportVehicleComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransportVehicleComponent_companyId_condition_idx" ON "TransportVehicleComponent"("companyId", "condition");

-- CreateIndex
CREATE INDEX "TransportVehicleComponent_companyId_vehicleId_idx" ON "TransportVehicleComponent"("companyId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportVehicleComponent_vehicleId_componentKey_key" ON "TransportVehicleComponent"("vehicleId", "componentKey");

-- CreateIndex
CREATE INDEX "TransportVehicle_companyId_vehicleClass_idx" ON "TransportVehicle"("companyId", "vehicleClass");

-- AddForeignKey
ALTER TABLE "TransportVehicleComponent" ADD CONSTRAINT "TransportVehicleComponent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportVehicleComponent" ADD CONSTRAINT "TransportVehicleComponent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
