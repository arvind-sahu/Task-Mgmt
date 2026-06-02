import { NotificationType, TaskStatus } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireNotificationDelegate } from "~/server/prismaDelegates";
import { isOverdue } from "~/utils/date";

const DUE_SOON_MS = 24 * 60 * 60 * 1000;

export const notificationRouter = createTRPCRouter({
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const notifications = requireNotificationDelegate();
    const now = Date.now();
    const [stored, dueSoon] = await Promise.all([
      notifications.count({
        where: { userId, readAt: null },
      }),
      ctx.db.task.count({
        where: {
          status: { not: TaskStatus.DONE },
          deadline: {
            lte: new Date(now + DUE_SOON_MS),
            gte: new Date(now),
          },
          assignees: { some: { id: userId } },
          project: {
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          },
        },
      }),
    ]);
    return stored + dueSoon;
  }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(30) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const now = new Date();

      const notifications = requireNotificationDelegate();
      const [stored, dueTasks] = await Promise.all([
        notifications.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        }),
        ctx.db.task.findMany({
          where: {
            status: { not: TaskStatus.DONE },
            deadline: { not: null, lte: new Date(now.getTime() + DUE_SOON_MS) },
            assignees: { some: { id: userId } },
            project: {
              OR: [{ ownerId: userId }, { members: { some: { userId } } }],
            },
          },
          include: { project: { select: { name: true } } },
          take: 10,
        }),
      ]);

      const dueItems = dueTasks.map((t) => ({
        id: `due-${t.id}`,
        type: NotificationType.TASK_DUE,
        title: isOverdue(t.deadline) ? "Task overdue" : "Task due soon",
        message: `${t.title} · ${t.project.name}`,
        link: `/tasks/${t.id}`,
        readAt: null as Date | null,
        createdAt: t.deadline ?? now,
        synthetic: true as const,
      }));

      const merged = [
        ...dueItems,
        ...stored.map((n) => ({ ...n, synthetic: false as const })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, input.limit);

      return merged;
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireNotificationDelegate().updateMany({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { readAt: new Date() },
      });
      return { ok: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await requireNotificationDelegate().updateMany({
      where: { userId: ctx.session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }),
});
