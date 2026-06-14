import { TRPCError } from "@trpc/server";

export type WorkflowStatusRow = {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
  isInitial: boolean;
  isTerminal: boolean;
  legacyStatus: string | null;
};

export type WorkflowTransitionRow = {
  id: string;
  fromStatusId: string;
  toStatusId: string;
  requiresComment: boolean;
  requiresAttachment: boolean;
};

export type WorkflowSettings = {
  creationLimit: number;
  allowCreationInAnyNonTerminal: boolean;
};

export function getCreationAllowedStatusIds(
  statuses: WorkflowStatusRow[],
  settings: WorkflowSettings,
): string[] {
  const ordered = [...statuses].sort((a, b) => a.orderIndex - b.orderIndex);

  if (settings.allowCreationInAnyNonTerminal) {
    return ordered.filter((s) => !s.isTerminal).map((s) => s.id);
  }

  const limit = Math.min(
    Math.max(settings.creationLimit, 2),
    5,
  );
  return ordered.slice(0, limit).map((s) => s.id);
}

export function getAllowedNextStatusIds(
  currentStatusId: string,
  transitions: WorkflowTransitionRow[],
): string[] {
  return transitions
    .filter((t) => t.fromStatusId === currentStatusId)
    .map((t) => t.toStatusId);
}

export function assertStatusCreationAllowed(
  statusId: string,
  statuses: WorkflowStatusRow[],
  settings: WorkflowSettings,
) {
  const allowed = getCreationAllowedStatusIds(statuses, settings);
  if (!allowed.includes(statusId)) {
    const names = statuses
      .filter((s) => allowed.includes(s.id))
      .map((s) => s.name)
      .join(", ");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Tasks can only be created in: ${names || "allowed workflow statuses"}`,
    });
  }
}

export function assertTransitionAllowed(
  fromStatusId: string,
  toStatusId: string,
  transitions: WorkflowTransitionRow[],
  options?: {
    transitionComment?: string;
    hasAttachments?: boolean;
  },
) {
  if (fromStatusId === toStatusId) return;

  const rule = transitions.find(
    (t) => t.fromStatusId === fromStatusId && t.toStatusId === toStatusId,
  );
  if (!rule) {
    throw new TRPCError({
      code: "UNPROCESSABLE_CONTENT",
      message: "This status transition is not allowed by the project workflow",
    });
  }

  if (rule.requiresComment && !options?.transitionComment?.trim()) {
    throw new TRPCError({
      code: "UNPROCESSABLE_CONTENT",
      message: "This transition requires a comment explaining the change",
    });
  }

  if (rule.requiresAttachment && !options?.hasAttachments) {
    throw new TRPCError({
      code: "UNPROCESSABLE_CONTENT",
      message: "This transition requires at least one attachment on the task",
    });
  }
}

export function validateWorkflowPayload(
  statuses: Array<{
    id?: string;
    name: string;
    color: string;
    orderIndex: number;
    isInitial: boolean;
    isTerminal: boolean;
    legacyStatus?: string | null;
  }>,
  transitions: Array<{
    fromStatusId: string;
    toStatusId: string;
    requiresComment?: boolean;
    requiresAttachment?: boolean;
  }>,
) {
  if (statuses.length < 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Workflow must have at least two statuses",
    });
  }

  const initialCount = statuses.filter((s) => s.isInitial).length;
  if (initialCount === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one status must be marked as initial",
    });
  }

  const statusIds = new Set(statuses.map((s) => s.id ?? s.name));
  for (const t of transitions) {
    if (!statusIds.has(t.fromStatusId) && !statuses.some((s) => s.id === t.fromStatusId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Transition references unknown from status",
      });
    }
    if (!statusIds.has(t.toStatusId) && !statuses.some((s) => s.id === t.toStatusId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Transition references unknown to status",
      });
    }
  }
}
