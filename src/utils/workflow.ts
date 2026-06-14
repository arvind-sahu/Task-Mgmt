import type { RouterOutputs } from "~/utils/api";

export type ProjectWorkflow = RouterOutputs["workflow"]["byProject"];
export type WorkflowStatus = ProjectWorkflow["statuses"][number];

export function sortStatuses(statuses: WorkflowStatus[]): WorkflowStatus[] {
  return [...statuses].sort((a, b) => a.orderIndex - b.orderIndex);
}

export function getAllowedNextStatuses(
  workflow: ProjectWorkflow,
  currentStatusId: string | null | undefined,
): WorkflowStatus[] {
  if (!currentStatusId) return sortStatuses(workflow.statuses);
  const nextIds = workflow.transitions
    .filter((t) => t.fromStatusId === currentStatusId)
    .map((t) => t.toStatusId);
  const current = workflow.statuses.find((s) => s.id === currentStatusId);
  const options = workflow.statuses.filter(
    (s) => s.id === currentStatusId || nextIds.includes(s.id),
  );
  return sortStatuses(options.length ? options : current ? [current] : []);
}

export function getCreationStatuses(workflow: ProjectWorkflow): WorkflowStatus[] {
  return sortStatuses(
    workflow.statuses.filter((s) =>
      workflow.creationAllowedStatusIds.includes(s.id),
    ),
  );
}

export function isWorkflowStatusCompleted(
  status: WorkflowStatus | null | undefined,
  legacyStatus?: string | null,
): boolean {
  if (status?.isTerminal) return true;
  return legacyStatus === "DONE";
}

export function statusDisplayName(
  status: WorkflowStatus | null | undefined,
  legacyStatus?: string | null,
): string {
  if (status?.name) return status.name;
  if (legacyStatus) return legacyStatus.replace(/_/g, " ").toLowerCase();
  return "Unknown";
}
