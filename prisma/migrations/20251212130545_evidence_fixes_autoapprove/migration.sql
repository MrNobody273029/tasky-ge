-- AlterTable
ALTER TABLE "TaskEvidence" ADD COLUMN     "autoApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsFixesAt" TIMESTAMP(3),
ADD COLUMN     "needsFixesReason" TEXT;
