-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatThread_ownerId_updatedAt_idx" ON "ChatThread"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatThread_applicantId_updatedAt_idx" ON "ChatThread"("applicantId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatThread_ownerId_hasUnreadForOwner_idx" ON "ChatThread"("ownerId", "hasUnreadForOwner");

-- CreateIndex
CREATE INDEX "ChatThread_applicantId_hasUnreadForApplicant_idx" ON "ChatThread"("applicantId", "hasUnreadForApplicant");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_status_category_idx" ON "Task"("status", "category");

-- CreateIndex
CREATE INDEX "Task_authorId_status_idx" ON "Task"("authorId", "status");

-- CreateIndex
CREATE INDEX "TaskApplication_taskId_idx" ON "TaskApplication"("taskId");

-- CreateIndex
CREATE INDEX "TaskApplication_applicantId_idx" ON "TaskApplication"("applicantId");

-- CreateIndex
CREATE INDEX "TaskApplication_taskId_status_idx" ON "TaskApplication"("taskId", "status");

-- CreateIndex
CREATE INDEX "TaskApplication_applicantId_status_idx" ON "TaskApplication"("applicantId", "status");

-- CreateIndex
CREATE INDEX "TaskClaim_userId_idx" ON "TaskClaim"("userId");

-- CreateIndex
CREATE INDEX "TaskClaim_taskId_idx" ON "TaskClaim"("taskId");

-- CreateIndex
CREATE INDEX "TaskEvidence_taskId_idx" ON "TaskEvidence"("taskId");

-- CreateIndex
CREATE INDEX "TaskEvidence_authorId_idx" ON "TaskEvidence"("authorId");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_status_idx" ON "WalletTransaction"("userId", "status");
