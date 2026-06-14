import type { PrismaClient } from "@prisma/client";

import { canCustomizeWorkflow } from "./defaults";
import {
  getAllowedNextStatusIds,
  getCreationAllowedStatusIds,
  type WorkflowSettings,
  type WorkflowStatusRow,
  type WorkflowTransitionRow,
} from "./validation";

type Db = Pick<
  PrismaClient,
  "project" | "projectStatus" | "workflowTransition" | "company"
>;

export type ProjectWorkflow = {
  statuses: WorkflowStatusRow[];
  transitions: WorkflowTransitionRow[];
  settings: WorkflowSettings;
  canCustomize: boolean;
  companyPlan: string | null;
  creationAllowedStatusIds: string[];
};

export async function loadProjectWorkflow(
  db: Db,
  projectId: string,
): Promise<ProjectWorkflow> {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      workflowCreationLimit: true,
      workflowAllowCreationInAnyNonTerminal: true,
      company: { select: { plan: true } },
    },
  });

  const statuses = await db.projectStatus.findMany({
    where: { projectId },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      orderIndex: true,
      isInitial: true,
      isTerminal: true,
      legacyStatus: true,
    },
  });

  const transitions = await db.workflowTransition.findMany({
    where: { projectId },
    select: {
      id: true,
      fromStatusId: true,
      toStatusId: true,
      requiresComment: true,
      requiresAttachment: true,
    },
  });

  const settings: WorkflowSettings = {
    creationLimit: project.workflowCreationLimit,
    allowCreationInAnyNonTerminal:
      project.workflowAllowCreationInAnyNonTerminal,
  };

  const companyPlan = project.company?.plan ?? null;

  return {
    statuses,
    transitions,
    settings,
    canCustomize: canCustomizeWorkflow(companyPlan),
    companyPlan,
    creationAllowedStatusIds: getCreationAllowedStatusIds(statuses, settings),
  };
}

export function workflowForTaskStatusChange(
  workflow: ProjectWorkflow,
  currentStatusId: string,
): string[] {
  return getAllowedNextStatusIds(currentStatusId, workflow.transitions);
}
