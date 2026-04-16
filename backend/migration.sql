-- Migration: Add relational structure for Location and Manager
-- Run this BEFORE the data migration script

-- Step 1: Create Location table
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- Create unique index on location name
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- Step 2: Add new foreign key columns to Candidate table
ALTER TABLE "Candidate" ADD COLUMN "locationId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "hiringManagerId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "recruiterId" TEXT;

-- Step 3: Add new foreign key columns to ManagerAvailability table
ALTER TABLE "ManagerAvailability" ADD COLUMN "locationId" TEXT;
ALTER TABLE "ManagerAvailability" ADD COLUMN "managerId" TEXT;

-- Step 4: Add new foreign key columns to Appointment table
ALTER TABLE "Appointment" ADD COLUMN "locationId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "managerId" TEXT;

-- Step 5: Create indexes on new foreign key columns
CREATE INDEX "Candidate_locationId_idx" ON "Candidate"("locationId");
CREATE INDEX "Candidate_hiringManagerId_idx" ON "Candidate"("hiringManagerId");
CREATE INDEX "Candidate_recruiterId_idx" ON "Candidate"("recruiterId");

CREATE INDEX "ManagerAvailability_locationId_idx" ON "ManagerAvailability"("locationId");
CREATE INDEX "ManagerAvailability_managerId_idx" ON "ManagerAvailability"("managerId");

CREATE INDEX "Appointment_locationId_idx" ON "Appointment"("locationId");
CREATE INDEX "Appointment_managerId_idx" ON "Appointment"("managerId");

-- Step 6: Add foreign key constraints
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_locationId_fkey" 
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_hiringManagerId_fkey" 
  FOREIGN KEY ("hiringManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_recruiterId_fkey" 
  FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManagerAvailability" ADD CONSTRAINT "ManagerAvailability_locationId_fkey" 
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ManagerAvailability" ADD CONSTRAINT "ManagerAvailability_managerId_fkey" 
  FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" 
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_managerId_fkey" 
  FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: After running this migration, you MUST:
-- 1. Run the data migration script (migrate-existing-data.ts) to populate the new foreign keys
-- 2. Test thoroughly to verify all data was migrated correctly
-- 3. Only after successful verification, you can optionally remove the old text columns:
--    - ALTER TABLE "Candidate" DROP COLUMN "location";
--    - ALTER TABLE "Candidate" DROP COLUMN "hiringManager";
--    - ALTER TABLE "Candidate" DROP COLUMN "recruiter";
--    - ALTER TABLE "ManagerAvailability" DROP COLUMN "location";
--    - ALTER TABLE "ManagerAvailability" DROP COLUMN "managerName";
--    - ALTER TABLE "ManagerAvailability" DROP COLUMN "managerEmail";
--    - ALTER TABLE "Appointment" DROP COLUMN "location";
--    - ALTER TABLE "Appointment" DROP COLUMN "managerName";
--    - ALTER TABLE "Appointment" DROP COLUMN "managerEmail";
