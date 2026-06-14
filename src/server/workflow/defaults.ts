import { TaskStatus, type CompanyPlan } from "@prisma/client";

export type DefaultStatusDef = {
  legacyStatus: TaskStatus;
  name: string;
  color: string;
  orderIndex: number;
  isInitial: boolean;
  isTerminal: boolean;
};

/** Fixed free-tier workflow: Todo → Backlog → In Progress → Review → Done */
export const DEFAULT_WORKFLOW_STATUSES: DefaultStatusDef[] = [
  {
    legacyStatus: TaskStatus.TODO,
    name: "To do",
    color: "#64748B",
    orderIndex: 0,
    isInitial: true,
    isTerminal: false,
  },
  {
    legacyStatus: TaskStatus.BACKLOG,
    name: "Backlog",
    color: "#8B5CF6",
    orderIndex: 1,
    isInitial: true,
    isTerminal: false,
  },
  {
    legacyStatus: TaskStatus.IN_PROGRESS,
    name: "In progress",
    color: "#3B82F6",
    orderIndex: 2,
    isInitial: false,
    isTerminal: false,
  },
  {
    legacyStatus: TaskStatus.IN_REVIEW,
    name: "In review",
    color: "#F59E0B",
    orderIndex: 3,
    isInitial: false,
    isTerminal: false,
  },
  {
    legacyStatus: TaskStatus.DONE,
    name: "Done",
    color: "#10B981",
    orderIndex: 4,
    isInitial: false,
    isTerminal: true,
  },
];

/** Default allowed transitions for the free-tier workflow. */
export const DEFAULT_WORKFLOW_TRANSITIONS: Array<{
  from: TaskStatus;
  to: TaskStatus;
  requiresComment?: boolean;
  requiresAttachment?: boolean;
}> = [
  { from: TaskStatus.TODO, to: TaskStatus.BACKLOG },
  { from: TaskStatus.TODO, to: TaskStatus.IN_PROGRESS },
  { from: TaskStatus.BACKLOG, to: TaskStatus.TODO },
  { from: TaskStatus.BACKLOG, to: TaskStatus.IN_PROGRESS },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.TODO },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.IN_REVIEW },
  { from: TaskStatus.IN_REVIEW, to: TaskStatus.IN_PROGRESS, requiresComment: true },
  { from: TaskStatus.IN_REVIEW, to: TaskStatus.DONE },
  // Done has no outgoing transitions
];

export function canCustomizeWorkflow(plan: CompanyPlan | null | undefined): boolean {
  return plan === "PRO" || plan === "BUSINESS" || plan === "ENTERPRISE";
}

export function legacyStatusForProjectStatus(
  legacyStatus: TaskStatus | null | undefined,
  isTerminal: boolean,
): TaskStatus {
  if (legacyStatus) return legacyStatus;
  if (isTerminal) return TaskStatus.DONE;
  return TaskStatus.TODO;
}
