-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('CERTIFICATION', 'EDUCATION', 'LICENSE', 'AWARD', 'COURSE');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'UNAVAILABLE');

-- Remove availability column from profiles table
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "availability";

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "description" TEXT,
    "credentialUrl" TEXT,
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_structures" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "webDevelopmentMin" DECIMAL(65,30),
    "webDevelopmentMax" DECIMAL(65,30),
    "consultingMin" DECIMAL(65,30),
    "consultingMax" DECIMAL(65,30),
    "maintenanceMin" DECIMAL(65,30),
    "maintenanceMax" DECIMAL(65,30),
    "smallProjectMin" DECIMAL(65,30),
    "smallProjectMax" DECIMAL(65,30),
    "mediumProjectMin" DECIMAL(65,30),
    "mediumProjectMax" DECIMAL(65,30),
    "largeProjectMin" DECIMAL(65,30),
    "largeProjectMax" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_preferences" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "arrangements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "teamSize" TEXT,
    "communicationStyle" TEXT,
    "workingHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_experiences" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "years" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availabilities" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "hoursPerWeek" INTEGER DEFAULT 40,
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_structures_profileId_key" ON "rate_structures"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "work_preferences_profileId_key" ON "work_preferences"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "availabilities_profileId_key" ON "availabilities"("profileId");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_structures" ADD CONSTRAINT "rate_structures_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_preferences" ADD CONSTRAINT "work_preferences_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_experiences" ADD CONSTRAINT "industry_experiences_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
