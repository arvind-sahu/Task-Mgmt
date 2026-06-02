import { TaskStatus } from "@prisma/client";

import type { db } from "~/server/db";

type Db = typeof db;

export type SprintStatusBreakdown = Record<TaskStatus, number>;

export function emptyStatusBreakdown(): SprintStatusBreakdown {
  return {
    BACKLOG: 0,
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
}

export function totalFromBreakdown(breakdown: SprintStatusBreakdown): number {
  return Object.values(breakdown).reduce((sum, count) => sum + count, 0);
}

/** One grouped query instead of loading every task row for sprint stats. */
export async function loadSprintStatusBreakdowns(
  database: Db,
  projectId: string,
  sprintIds: string[],
): Promise<Map<string, SprintStatusBreakdown>> {
  const map = new Map<string, SprintStatusBreakdown>();
  if (sprintIds.length === 0) return map;

  for (const sprintId of sprintIds) {
    map.set(sprintId, emptyStatusBreakdown());
  }

  const groups = await database.task.groupBy({
    by: ["sprintId", "status"],
    where: { projectId, sprintId: { in: sprintIds } },
    _count: { _all: true },
  });

  applyTaskGroups(map, groups);
  return map;
}

/** Load status counts for every sprint in a project (one grouped query). */
export async function loadProjectSprintStatusBreakdowns(
  database: Db,
  projectId: string,
): Promise<Map<string, SprintStatusBreakdown>> {
  const map = new Map<string, SprintStatusBreakdown>();
  const groups = await database.task.groupBy({
    by: ["sprintId", "status"],
    where: { projectId, sprintId: { not: null } },
    _count: { _all: true },
  });
  applyTaskGroups(map, groups);
  return map;
}

function applyTaskGroups(
  map: Map<string, SprintStatusBreakdown>,
  groups: Array<{
    sprintId: string | null;
    status: TaskStatus;
    _count: { _all: number };
  }>,
) {
  for (const row of groups) {
    if (!row.sprintId) continue;
    const breakdown = map.get(row.sprintId) ?? emptyStatusBreakdown();
    breakdown[row.status] = row._count._all;
    map.set(row.sprintId, breakdown);
  }
}

type SprintRow = {
  id: string;
  projectId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export function withSprintStats<T extends SprintRow>(
  sprint: T,
  breakdown: SprintStatusBreakdown | undefined,
) {
  const statusBreakdown = breakdown ?? emptyStatusBreakdown();
  const total = totalFromBreakdown(statusBreakdown);
  return {
    ...sprint,
    statusBreakdown,
    _count: { tasks: total },
    /** @deprecated Stats come from `statusBreakdown`; kept for type compatibility. */
    tasks: [] as { status: TaskStatus }[],
  };
}

export function projectMemberFilter(userId: string) {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}
