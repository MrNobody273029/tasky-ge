-- AlterEnum
ALTER TYPE "EvidenceStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "TaskEvidence" ADD COLUMN     "clientSawRatingPrompt" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "clientSawWorkerReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "clientSystemSeen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fixForId" TEXT,
ADD COLUMN     "workerDecisionSeen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "workerSawClientReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "workerSawRatingPrompt" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "TaskEvidence" ADD CONSTRAINT "TaskEvidence_fixForId_fkey" FOREIGN KEY ("fixForId") REFERENCES "TaskEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
