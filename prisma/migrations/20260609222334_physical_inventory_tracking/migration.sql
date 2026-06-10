-- AlterTable
ALTER TABLE "PhysicalInventoryItem" ADD COLUMN     "expirationDate" TIMESTAMP(3),
ADD COLUMN     "lotNumber" TEXT,
ADD COLUMN     "serialNumber" TEXT;
