-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
