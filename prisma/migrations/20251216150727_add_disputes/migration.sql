/*
  Warnings:

  - You are about to drop the column `details` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `openedById` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `resolutionNote` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Dispute` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[evidenceId]` on the table `Dispute` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clientId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deadlineAt` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workerId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Made the column `taskId` on table `Dispute` required. This step will fail if there are existing NULL values in that column.
  - Made the column `evidenceId` on table `Dispute` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DisputeStatus" ADD VALUE 'WAITING_OTHER';
ALTER TYPE "DisputeStatus" ADD VALUE 'BOTH_SUBMITTED';
ALTER TYPE "DisputeStatus" ADD VALUE 'SENT';

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_evidenceId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_openedById_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_taskId_fkey";

-- DropIndex
DROP INDEX "Dispute_evidenceId_idx";

-- AlterTable
ALTER TABLE "Dispute" DROP COLUMN "details",
DROP COLUMN "openedById",
DROP COLUMN "resolutionNote",
DROP COLUMN "title",
ADD COLUMN     "clientFiles" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "clientPhotos" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "clientSeen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "clientSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clientText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "clientVideos" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "deadlineAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "resultText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "workerFiles" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "workerId" TEXT NOT NULL,
ADD COLUMN     "workerPhotos" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "workerSeen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "workerSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workerText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "workerVideos" TEXT NOT NULL DEFAULT '[]',
ALTER COLUMN "taskId" SET NOT NULL,
ALTER COLUMN "evidenceId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_evidenceId_key" ON "Dispute"("evidenceId");

-- CreateIndex
CREATE INDEX "Dispute_clientId_status_idx" ON "Dispute"("clientId", "status");

-- CreateIndex
CREATE INDEX "Dispute_workerId_status_idx" ON "Dispute"("workerId", "status");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "TaskEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
