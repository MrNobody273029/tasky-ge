-- AlterTable
ALTER TABLE "TaskApplication" ADD COLUMN     "ownerSeen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TaskApplication_status_ownerSeen_idx" ON "TaskApplication"("status", "ownerSeen");
