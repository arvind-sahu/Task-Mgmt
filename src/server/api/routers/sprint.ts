import { ProjectRole, TaskStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sanitizePlainText } from "~/server/security/sanitize";

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function nextDayStart(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + 1);
  return next;
}

function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

async function assertContinuousSprintTimeline(
  db: Parameters<typeof assertProjectAccess>[0],
  input: {
    projectId: string;
    startDate: Date;
    endDate: Date;
    excludeSprintId?: string;
  },
) {
  const sprints = await db.sprint.findMany({
    where: {
      projectId: input.projectId,
      id: input.excludeSprintId ? { not: input.excludeSprintId } : undefined,
    },
    select: { startDate: true, endDate: true },
  });
  const timeline = [
    ...sprints,
    { startDate: input.startDate, endDate: input.endDate },
  ].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  for (let index = 0; index < timeline.length - 1; index += 1) {
    const current = timeline[index];
    const next = timeline[index + 1];
    if (!current || !next) continue;
    if (next.startDate <= current.endDate) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Sprint dates cannot overlap in the same project",
      });
    }
    if (!sameDay(next.startDate, nextDayStart(current.endDate))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Sprint dates must be continuous without gap days",
      });
    }
  }
}

export const sprintRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.session.user.id);
      return ctx.db.sprint.findMany({
        where: { projectId: input.projectId },
        include: {
          tasks: {
            select: { status: true },
          },
          _count: { select: { tasks: true } },
        },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        name: z.string().min(1).max(120).optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );
      const project = await ctx.db.project.findUniqueOrThrow({
        where: { id: input.projectId },
        select: { sprintDurationWeeks: true },
      });
      const startDate = startOfDay(input.startDate);
      const endDate = input.endDate
        ? endOfDay(input.endDate)
        : endOfDay(
            new Date(
              startDate.getTime() +
                project.sprintDurationWeeks * 7 * 24 * 60 * 60 * 1000 -
                24 * 60 * 60 * 1000,
            ),
          );
      if (endDate < startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sprint end date must be after the start date",
        });
      }
      await assertContinuousSprintTimeline(ctx.db, {
        projectId: input.projectId,
        startDate,
        endDate,
      });

      return ctx.db.sprint.create({
        data: {
          projectId: input.projectId,
          name: sanitizePlainText(
            input.name ?? `Sprint ${startDate.toISOString().slice(0, 10)}`,
          ),
          startDate,
          endDate,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(120).optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sprint = await ctx.db.sprint.findUniqueOrThrow({
        where: { id: input.id },
        select: { projectId: true, startDate: true, endDate: true },
      });
      await assertProjectAccess(
        ctx.db,
        sprint.projectId,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );
      const startDate = input.startDate ? startOfDay(input.startDate) : sprint.startDate;
      const endDate = input.endDate ? endOfDay(input.endDate) : sprint.endDate;
      if (endDate < startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sprint end date must be after the start date",
        });
      }
      await assertContinuousSprintTimeline(ctx.db, {
        projectId: sprint.projectId,
        startDate,
        endDate,
        excludeSprintId: input.id,
      });

      return ctx.db.sprint.update({
        where: { id: input.id },
        data: {
          name: input.name ? sanitizePlainText(input.name) : undefined,
          startDate: input.startDate ? startDate : undefined,
          endDate: input.endDate ? endDate : undefined,
        },
      });
    }),

  assignTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string().cuid(),
        sprintId: z.string().cuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUniqueOrThrow({
        where: { id: input.taskId },
        select: { projectId: true },
      });
      await assertProjectAccess(ctx.db, task.projectId, ctx.session.user.id);
      if (input.sprintId) {
        const sprint = await ctx.db.sprint.findUniqueOrThrow({
          where: { id: input.sprintId },
          select: { projectId: true },
        });
        if (sprint.projectId !== task.projectId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Sprint does not belong to this project",
          });
        }
      }

      return ctx.db.task.update({
        where: { id: input.taskId },
        data: {
          status: input.sprintId === null ? TaskStatus.BACKLOG : TaskStatus.TODO,
          sprint:
            input.sprintId === null
              ? { disconnect: true }
              : { connect: { id: input.sprintId } },
        },
      });
    }),

  backlog: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.session.user.id);
      const now = new Date();
      await ctx.db.task.updateMany({
        where: {
          projectId: input.projectId,
          status: { notIn: [TaskStatus.BACKLOG, TaskStatus.DONE] },
          OR: [{ sprintId: null }, { sprint: { endDate: { lt: now } } }],
        },
        data: { status: TaskStatus.BACKLOG, sprintId: null },
      });
      return ctx.db.task.findMany({
        where: {
          projectId: input.projectId,
          status: TaskStatus.BACKLOG,
        },
        include: {
          assignees: { select: { id: true, name: true, email: true, image: true } },
          tags: true,
          creator: { select: { id: true, name: true, email: true, image: true } },
          sprint: true,
          _count: { select: { comments: true } },
        },
        orderBy: [
          { deadline: { sort: "asc", nulls: "last" } },
          { createdAt: "desc" },
        ],
      });
    }),
});
