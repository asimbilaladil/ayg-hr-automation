-- CreateTable
CREATE TABLE "RevelCallLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT,
    "endedReason" TEXT,
    "vapiCallId" TEXT,
    "durationSec" INTEGER,
    "recordingUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevelCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevelCallLog_employeeId_attemptedAt_idx" ON "RevelCallLog"("employeeId", "attemptedAt");

-- AddForeignKey
ALTER TABLE "RevelCallLog" ADD CONSTRAINT "RevelCallLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "AygFoodsEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
