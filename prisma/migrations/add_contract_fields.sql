-- Add missing contract fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "scopeOfWork" TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "deliverables" TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "paymentSchedule" TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "duration" TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "intellectualPropertyRights" TEXT;
