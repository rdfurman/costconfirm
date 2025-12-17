-- CreateTable
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "resource" TEXT,
    "action" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityLog_userId_idx" ON "SecurityLog"("userId");

-- CreateIndex
CREATE INDEX "SecurityLog_event_idx" ON "SecurityLog"("event");

-- CreateIndex
CREATE INDEX "SecurityLog_createdAt_idx" ON "SecurityLog"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityLog_email_idx" ON "SecurityLog"("email");
