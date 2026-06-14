-- Custom workflow & status engine
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "workflowCreationLimit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "workflowAllowCreationInAnyNonTerminal" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "ProjectStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#94A3B8',
    "orderIndex" INTEGER NOT NULL,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "legacyStatus" "TaskStatus",
    "projectId" TEXT NOT NULL,
    CONSTRAINT "ProjectStatus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkflowTransition" (
    "id" TEXT NOT NULL,
    "requiresComment" BOOLEAN NOT NULL DEFAULT false,
    "requiresAttachment" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "fromStatusId" TEXT NOT NULL,
    "toStatusId" TEXT NOT NULL,
    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "statusId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectStatus_projectId_orderIndex_key" ON "ProjectStatus"("projectId", "orderIndex");
CREATE INDEX IF NOT EXISTS "ProjectStatus_projectId_idx" ON "ProjectStatus"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowTransition_fromStatusId_toStatusId_key" ON "WorkflowTransition"("fromStatusId", "toStatusId");
CREATE INDEX IF NOT EXISTS "WorkflowTransition_projectId_idx" ON "WorkflowTransition"("projectId");
CREATE INDEX IF NOT EXISTS "Task_statusId_idx" ON "Task"("statusId");

DO $$ BEGIN
    ALTER TABLE "ProjectStatus" ADD CONSTRAINT "ProjectStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "ProjectStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "ProjectStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
