import type { PrismaClient } from "@prisma/client";

import {
  DEFAULT_WORKFLOW_STATUSES,
  DEFAULT_WORKFLOW_TRANSITIONS,
} from "./defaults";

type Db = Pick<PrismaClient, "projectStatus" | "workflowTransition">;

/** Seed default workflow statuses and transitions for a new project. */
export async function seedProjectWorkflow(db: Db, projectId: string) {
  const statusByLegacy = new Map<string, string>();

  for (const def of DEFAULT_WORKFLOW_STATUSES) {
    const created = await db.projectStatus.create({
      data: {
        projectId,
        name: def.name,
        color: def.color,
        orderIndex: def.orderIndex,
        isInitial: def.isInitial,
        isTerminal: def.isTerminal,
        legacyStatus: def.legacyStatus,
      },
    });
    statusByLegacy.set(def.legacyStatus, created.id);
  }

  for (const rule of DEFAULT_WORKFLOW_TRANSITIONS) {
    const fromId = statusByLegacy.get(rule.from);
    const toId = statusByLegacy.get(rule.to);
    if (!fromId || !toId) continue;
    await db.workflowTransition.create({
      data: {
        projectId,
        fromStatusId: fromId,
        toStatusId: toId,
        requiresComment: rule.requiresComment ?? false,
        requiresAttachment: rule.requiresAttachment ?? false,
      },
    });
  }

  return statusByLegacy;
}

/** Backfill workflow for existing projects and link tasks to status rows. */
export async function backfillProjectWorkflow(
  db: Pick<
    PrismaClient,
  "project" | "projectStatus" | "workflowTransition" | "task"
  >,
  projectId: string,
) {
  const existing = await db.projectStatus.count({ where: { projectId } });
  if (existing > 0) return;

  const statusByLegacy = await seedProjectWorkflow(db, projectId);

  for (const [legacy, statusId] of statusByLegacy) {
    await db.task.updateMany({
      where: { projectId, status: legacy as never },
      data: { statusId },
    });
  }
}
