/*
  Warnings:

  - You are about to drop the `rate_structures` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."rate_structures" DROP CONSTRAINT "rate_structures_profileId_fkey";

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "gstHstNumber" TEXT,
ADD COLUMN     "taxExempt" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "public"."rate_structures";
