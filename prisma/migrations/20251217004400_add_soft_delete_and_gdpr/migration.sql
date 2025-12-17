-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX "Project_userId_deletedAt_idx" ON "Project"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_email_deletedAt_idx" ON "User"("email", "deletedAt");
