-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "additionalRequirements" TEXT,
ADD COLUMN     "deadlineFlexible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hybridPercentage" INTEGER,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "locationNotes" TEXT,
ADD COLUMN     "travelRadius" INTEGER,
ADD COLUMN     "workArrangement" TEXT;
