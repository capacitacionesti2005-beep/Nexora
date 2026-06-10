-- AlterTable
ALTER TABLE "PhysicalInventoryItem" ADD COLUMN     "countSource" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "evidenceImageUrl" TEXT;
