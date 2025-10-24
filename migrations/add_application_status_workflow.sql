-- Add new application status values to support full workflow
-- First, add the new enum values
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'SHORTLISTED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW_REQUESTED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW_SCHEDULED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW_COMPLETED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- Update existing PENDING applications to maintain compatibility
-- (Optional: you can skip this if you want to keep existing data as PENDING)
