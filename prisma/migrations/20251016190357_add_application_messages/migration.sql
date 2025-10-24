-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "applicationId" TEXT,
ALTER COLUMN "contractId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
