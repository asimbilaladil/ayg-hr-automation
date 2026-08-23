-- Rename Candidate.emailId -> Candidate.externalId
-- This column stored the Gmail message ID under the old email-triggered
-- pipeline; it's being repurposed as a generic external-source sync key
-- (e.g. HR Alliance applicant GUID) now that candidates arrive via API sync
-- instead of email. Values are preserved as-is by RENAME COLUMN.
ALTER TABLE "Candidate" RENAME COLUMN "emailId" TO "externalId";
ALTER INDEX "Candidate_emailId_key" RENAME TO "Candidate_externalId_key";

-- Generic key/value cursor storage for n8n polling syncs (e.g. HR Alliance).
CREATE TABLE "SyncCursor" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("key")
);
