-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT 'emerald',
ADD COLUMN     "costDecimals" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "costingMethod" TEXT NOT NULL DEFAULT 'AVERAGE',
ADD COLUMN     "quantityDecimals" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "uiDensity" TEXT NOT NULL DEFAULT 'comfortable',
ADD COLUMN     "uiTheme" TEXT NOT NULL DEFAULT 'light';
