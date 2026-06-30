-- CreateEnum
CREATE TYPE "TransportComponentEventType" AS ENUM ('INSPECTION', 'COMMENT', 'ADJUSTMENT', 'MAINTENANCE', 'REPLACEMENT');

-- CreateTable
CREATE TABLE "TransportVehicleComponentEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "eventType" "TransportComponentEventType" NOT NULL DEFAULT 'INSPECTION',
    "title" TEXT NOT NULL,
    "previousCondition" "TransportComponentCondition",
    "newCondition" "TransportComponentCondition",
    "currentValue" TEXT,
    "nextDueKm" INTEGER,
    "odometer" INTEGER,
    "notes" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportVehicleComponentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransportVehicleComponentEvent_companyId_vehicleId_createdA_idx" ON "TransportVehicleComponentEvent"("companyId", "vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportVehicleComponentEvent_companyId_componentId_create_idx" ON "TransportVehicleComponentEvent"("companyId", "componentId", "createdAt");

-- AddForeignKey
ALTER TABLE "TransportVehicleComponentEvent" ADD CONSTRAINT "TransportVehicleComponentEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportVehicleComponentEvent" ADD CONSTRAINT "TransportVehicleComponentEvent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "TransportVehicleComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
