-- AlterTable
ALTER TABLE "work_preferences" ADD COLUMN     "onSitePercentage" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "travelRadius" INTEGER NOT NULL DEFAULT 25;
