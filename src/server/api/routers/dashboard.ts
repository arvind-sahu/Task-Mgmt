import { TaskStatus } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { isOverdue } from "~/utils/date";

export const dashboardRouter = createTRPCRouter({
  analytics: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const tasks = await ctx.db.task.findMany({
      where: {
        project: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      },
      select: {
        id: true,
        status: true,
        priority: true,
        deadline: true,
        projectId: true,
        project: { select: { id: true, name: true, color: true } },
      },
    });

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

    const projectMap = new Map<
      string,
      { id: string; name: string; color: string; total: number; done: number }
    >();

    for (const t of tasks) {
      const p = projectMap.get(t.projectId) ?? {
        id: t.project.id,
        name: t.project.name,
        color: t.project.color,
        total: 0,
        done: 0,
      };
      p.total++;
      if (t.status === TaskStatus.DONE) p.done++;
      projectMap.set(t.projectId, p);
    }

    const projectProgress = [...projectMap.values()]
      .map((p) => ({
        ...p,
        percent: p.total === 0 ? 0 : Math.round((p.done / p.total) * 100),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return {
      summary: { completed, overdue, open, total: tasks.length },
      byStatus,
      byPriority,
      projectProgress,
    };
  }),
});
