-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "proposedApproach" TEXT,
ADD COLUMN     "proposedBudget" DECIMAL(65,30),
ADD COLUMN     "questions" TEXT,
ADD COLUMN     "selectedPortfolio" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "timeline" TEXT;
