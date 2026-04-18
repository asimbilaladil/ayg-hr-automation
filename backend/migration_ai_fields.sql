-- Migration: Add AI review and transcript fields to Candidate table
-- Run this on the production database before restarting the backend.

ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "aiScore"           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "aiRecommendation"  TEXT,
  ADD COLUMN IF NOT EXISTS "aiCriteriaMet"     TEXT,
  ADD COLUMN IF NOT EXISTS "aiCriteriaMissing" TEXT,
  ADD COLUMN IF NOT EXISTS "aiSummary"         TEXT,
  ADD COLUMN IF NOT EXISTS "transcript"        TEXT;

-- Optional index for filtering/sorting by AI recommendation and score
CREATE INDEX IF NOT EXISTS "Candidate_aiRecommendation_idx" ON "Candidate"("aiRecommendation");
CREATE INDEX IF NOT EXISTS "Candidate_aiScore_idx" ON "Candidate"("aiScore");
