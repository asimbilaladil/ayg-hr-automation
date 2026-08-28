-- Outbound call state on AygFoodsEmployee (mirrors Candidate)
ALTER TABLE "AygFoodsEmployee" ADD COLUMN "endedReason" TEXT;
ALTER TABLE "AygFoodsEmployee" ADD COLUMN "nextCallAt" TIMESTAMP(3);
ALTER TABLE "AygFoodsEmployee" ADD COLUMN "lastCallAt" TIMESTAMP(3);
