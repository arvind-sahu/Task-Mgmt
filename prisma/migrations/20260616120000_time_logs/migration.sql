CREATE TABLE IF NOT EXISTS "TimeLog" (
    "id" TEXT NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "logDate" DATE NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TimeLog_taskId_idx" ON "TimeLog"("taskId");
CREATE INDEX IF NOT EXISTS "TimeLog_userId_idx" ON "TimeLog"("userId");
CREATE INDEX IF NOT EXISTS "TimeLog_logDate_idx" ON "TimeLog"("logDate");
CREATE INDEX IF NOT EXISTS "TimeLog_userId_logDate_idx" ON "TimeLog"("userId", "logDate");

DO $$ BEGIN
    ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
