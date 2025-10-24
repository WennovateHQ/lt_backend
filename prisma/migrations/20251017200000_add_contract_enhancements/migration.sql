-- AlterEnum
ALTER TYPE "ContractStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable - Add missing contract fields
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "scopeOfWork" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "deliverables" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "paymentSchedule" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "duration" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "intellectualPropertyRights" TEXT;

-- AlterTable - Add missing profile fields for banking
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "sin" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "bankInstitution" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "bankTransit" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "bankAccountHolder" TEXT;

-- AlterTable - Add Stripe customer ID to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeCustomerId_key" ON "users"("stripeCustomerId");
