-- Add IN_PROGRESS status to ContractStatus enum
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS' AFTER 'ACTIVE';
