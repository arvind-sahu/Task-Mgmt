import { describe, expect, it } from "vitest";
import { TaskStatus } from "@prisma/client";

import { isOverdue } from "~/utils/date";

/** Mirrors dashboard.analytics aggregation logic for unit testing. */
function summarizeTasks(
  tasks: {
    status: TaskStatus;
    priority: string;
    deadline: Date | null;
  }[],
) {
  const byStatus: Record<string, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
  const byPriority: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };

  let completed = 0;
  let overdue = 0;
  let open = 0;

  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    if (t.status === TaskStatus.DONE) completed++;
    else {
      open++;
      if (isOverdue(t.deadline)) overdue++;
    }
  }

  return { completed, overdue, open, total: tasks.length, byStatus, byPriority };
}

describe("dashboard analytics summary", () => {
  it("counts completed, open, and overdue tasks", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    const summary = summarizeTasks([
      { status: TaskStatus.DONE, priority: "LOW", deadline: null },
      { status: TaskStatus.TODO, priority: "HIGH", deadline: yesterday },
      { status: TaskStatus.IN_PROGRESS, priority: "MEDIUM", deadline: null },
    ]);

    expect(summary.completed).toBe(1);
    expect(summary.open).toBe(2);
    expect(summary.overdue).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.byStatus.DONE).toBe(1);
    expect(summary.byPriority.HIGH).toBe(1);
  });
});
