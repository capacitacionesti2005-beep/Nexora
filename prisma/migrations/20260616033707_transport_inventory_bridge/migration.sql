-- CreateEnum
CREATE TYPE "TransportAssetStatus" AS ENUM ('AVAILABLE', 'IN_ROUTE', 'MAINTENANCE', 'BLOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TransportMaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TransportVehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "TransportAssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "capacity" TEXT,
    "odometer" INTEGER NOT NULL DEFAULT 0,
    "currentZone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportDriver" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentId" TEXT,
    "license" TEXT,
    "status" "TransportAssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "phone" TEXT,
    "score" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Planificada',
    "priority" TEXT NOT NULL DEFAULT 'Media',
    "eta" TIMESTAMP(3),
    "vehicleId" TEXT,
    "driverId" TEXT,
    "value" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportMaintenanceOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" "TransportMaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "type" TEXT NOT NULL DEFAULT 'Correctivo',
    "odometer" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportMaintenanceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportMaintenancePart" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "maintenanceOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "inventoryMovementId" TEXT,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportMaintenancePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportFuelLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "gallons" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "odometer" INTEGER NOT NULL,
    "station" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportFuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportTire" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "position" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Disponible',
    "vehicleId" TEXT,
    "productId" TEXT,
    "treadMm" DECIMAL(18,4),
    "pressurePsi" DECIMAL(18,4),
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportTire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportTripExpense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportTripExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportTripAdvance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT,
    "driverId" TEXT,
    "amount" DECIMAL(18,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Abierto',
    "settledAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "TransportTripAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportChecklist" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Preoperacional',
    "result" TEXT NOT NULL DEFAULT 'Aprobado',
    "items" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransportVehicle_companyId_status_idx" ON "TransportVehicle"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportVehicle_companyId_plate_key" ON "TransportVehicle"("companyId", "plate");

-- CreateIndex
CREATE INDEX "TransportDriver_companyId_status_idx" ON "TransportDriver"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportDriver_companyId_documentId_key" ON "TransportDriver"("companyId", "documentId");

-- CreateIndex
CREATE INDEX "TransportOrder_companyId_status_idx" ON "TransportOrder"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportOrder_companyId_code_key" ON "TransportOrder"("companyId", "code");

-- CreateIndex
CREATE INDEX "TransportMaintenanceOrder_companyId_vehicleId_idx" ON "TransportMaintenanceOrder"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "TransportMaintenanceOrder_companyId_status_idx" ON "TransportMaintenanceOrder"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportMaintenanceOrder_companyId_code_key" ON "TransportMaintenanceOrder"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "TransportMaintenancePart_inventoryMovementId_key" ON "TransportMaintenancePart"("inventoryMovementId");

-- CreateIndex
CREATE INDEX "TransportMaintenancePart_companyId_productId_idx" ON "TransportMaintenancePart"("companyId", "productId");

-- CreateIndex
CREATE INDEX "TransportMaintenancePart_companyId_createdAt_idx" ON "TransportMaintenancePart"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportFuelLog_companyId_recordedAt_idx" ON "TransportFuelLog"("companyId", "recordedAt");

-- CreateIndex
CREATE INDEX "TransportFuelLog_companyId_vehicleId_idx" ON "TransportFuelLog"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "TransportTire_companyId_status_idx" ON "TransportTire"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportTire_companyId_code_key" ON "TransportTire"("companyId", "code");

-- CreateIndex
CREATE INDEX "TransportTripExpense_companyId_createdAt_idx" ON "TransportTripExpense"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportTripAdvance_companyId_createdAt_idx" ON "TransportTripAdvance"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportChecklist_companyId_createdAt_idx" ON "TransportChecklist"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "TransportVehicle" ADD CONSTRAINT "TransportVehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportDriver" ADD CONSTRAINT "TransportDriver_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportOrder" ADD CONSTRAINT "TransportOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportOrder" ADD CONSTRAINT "TransportOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportOrder" ADD CONSTRAINT "TransportOrder_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportMaintenanceOrder" ADD CONSTRAINT "TransportMaintenanceOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportMaintenanceOrder" ADD CONSTRAINT "TransportMaintenanceOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportMaintenancePart" ADD CONSTRAINT "TransportMaintenancePart_maintenanceOrderId_fkey" FOREIGN KEY ("maintenanceOrderId") REFERENCES "TransportMaintenanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportMaintenancePart" ADD CONSTRAINT "TransportMaintenancePart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportMaintenancePart" ADD CONSTRAINT "TransportMaintenancePart_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportMaintenancePart" ADD CONSTRAINT "TransportMaintenancePart_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportMaintenancePart" ADD CONSTRAINT "TransportMaintenancePart_inventoryMovementId_fkey" FOREIGN KEY ("inventoryMovementId") REFERENCES "InventoryMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportFuelLog" ADD CONSTRAINT "TransportFuelLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportFuelLog" ADD CONSTRAINT "TransportFuelLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportFuelLog" ADD CONSTRAINT "TransportFuelLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTire" ADD CONSTRAINT "TransportTire_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTire" ADD CONSTRAINT "TransportTire_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTripExpense" ADD CONSTRAINT "TransportTripExpense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTripExpense" ADD CONSTRAINT "TransportTripExpense_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TransportOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTripExpense" ADD CONSTRAINT "TransportTripExpense_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTripExpense" ADD CONSTRAINT "TransportTripExpense_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTripAdvance" ADD CONSTRAINT "TransportTripAdvance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTripAdvance" ADD CONSTRAINT "TransportTripAdvance_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TransportOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTripAdvance" ADD CONSTRAINT "TransportTripAdvance_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportChecklist" ADD CONSTRAINT "TransportChecklist_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportChecklist" ADD CONSTRAINT "TransportChecklist_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportChecklist" ADD CONSTRAINT "TransportChecklist_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
