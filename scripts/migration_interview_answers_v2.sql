-- Migration: Replace answer1/2/3 with single interviewAnswers JSON field
ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "interviewAnswers" TEXT;
