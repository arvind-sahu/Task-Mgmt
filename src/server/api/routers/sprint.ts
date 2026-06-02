import { ProjectRole, TaskStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  assertValidStartDayOfWeek,
  computeSprintEndDate,
  findInvalidSprintIds,
  sameDay,
  startOfDay,
  timelineViolations,
  type SprintProjectRules,
} from "~/server/sprint/rules";
import { sanitizePlainText } from "~/server/security/sanitize";
import {
  loadProjectSprintStatusBreakdowns,
  loadSprintStatusBreakdowns,
  projectMemberFilter,
  withSprintStats,
} from "~/server/sprint/stats";

async function loadProjectSprintRules(
  db: Parameters<typeof assertProjectAccess>[0],
  projectId: string,
): Promise<SprintProjectRules> {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      sprintPlan: true,
      sprintDurationWeeks: true,
      sprintStartDayOfWeek: true,
    },
  });
  return project;
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
  ];
  const violation = timelineViolations(timeline);
  if (violation === "overlap") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Sprint dates cannot overlap in the same project",
    });
  }
  if (violation === "gap") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Sprint dates must be continuous without gap days (next sprint starts the day after the previous ends)",
    });
  }
}

function assertSprintProjectRules(
  rules: SprintProjectRules,
  startDate: Date,
  endDate: Date,
) {
  try {
    assertValidStartDayOfWeek(rules, startDate);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Invalid sprint start day",
    });
  }

  const expectedEnd = computeSprintEndDate(startDate, rules.sprintDurationWeeks);
  if (!sameDay(endDate, expectedEnd)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Sprint must run for ${rules.sprintDurationWeeks} week(s) (${rules.sprintDurationWeeks * 7} days inclusive)`,
    });
  }
}

const sprintSelect = {
  id: true,
  projectId: true,
  name: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function findAccessibleSprint(
  db: Parameters<typeof assertProjectAccess>[0],
  projectId: string,
  userId: string,
  dateFilter?: { startDate: { lte: Date }; endDate: { gte: Date } },
) {
  return db.sprint.findFirst({
    where: {
      projectId,
      project: projectMemberFilter(userId),
      ...dateFilter,
    },
    select: sprintSelect,
    orderBy: dateFilter
      ? { startDate: "desc" }
      : [{ startDate: "desc" }, { createdAt: "desc" }],
  });
}

export const sprintRouter = createTRPCRouter({
  /** Active sprint for the project board (single row, no full list). */
  current: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const now = new Date();

      const [access, active] = await Promise.all([
        assertProjectAccess(ctx.db, input.projectId, userId),
        findAccessibleSprint(ctx.db, input.projectId, userId, {
          startDate: { lte: now },
          endDate: { gte: now },
        }),
      ]);

      void access;

      const sprint =
        active ??
        (await findAccessibleSprint(ctx.db, input.projectId, userId));

      if (!sprint) return null;

      const breakdowns = await loadSprintStatusBreakdowns(ctx.db, input.projectId, [
        sprint.id,
      ]);
      return withSprintStats(sprint, breakdowns.get(sprint.id));
    }),

  /** Lightweight id/name/dates for task forms — no task stats. */
  listBrief: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.session.user.id);
      return ctx.db.sprint.findMany({
        where: { projectId: input.projectId },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      });
    }),

  list: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await assertProjectAccess(ctx.db, input.projectId, userId);

      const [sprints, breakdowns] = await Promise.all([
        ctx.db.sprint.findMany({
          where: {
            projectId: input.projectId,
            project: projectMemberFilter(userId),
          },
          select: sprintSelect,
          orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        }),
        loadProjectSprintStatusBreakdowns(ctx.db, input.projectId),
      ]);

      return sprints.map((sprint) =>
        withSprintStats(
          sprint,
          breakdowns.get(sprint.id) ?? undefined,
        ),
      );
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        name: z.string().min(1).max(120).optional(),
        startDate: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );
      const rules = await loadProjectSprintRules(ctx.db, input.projectId);
      const startDate = startOfDay(input.startDate);
      const endDate = computeSprintEndDate(startDate, rules.sprintDurationWeeks);

      assertSprintProjectRules(rules, startDate, endDate);
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
      const rules = await loadProjectSprintRules(ctx.db, sprint.projectId);
      const startDate = input.startDate
        ? startOfDay(input.startDate)
        : sprint.startDate;
      const endDate = computeSprintEndDate(startDate, rules.sprintDurationWeeks);

      assertSprintProjectRules(rules, startDate, endDate);
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
          endDate: input.startDate ? endDate : undefined,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await ctx.db.sprint.findUniqueOrThrow({
        where: { id: input.id },
        select: { projectId: true },
      });
      await assertProjectAccess(
        ctx.db,
        sprint.projectId,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );
      await ctx.db.sprint.delete({ where: { id: input.id } });
      return { ok: true as const };
    }),

  cleanupInvalid: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );
      const rules = await loadProjectSprintRules(ctx.db, input.projectId);
      const sprints = await ctx.db.sprint.findMany({
        where: { projectId: input.projectId },
        select: { id: true, startDate: true, endDate: true },
      });
      const invalidIds = findInvalidSprintIds(rules, sprints);
      if (invalidIds.length === 0) {
        return { deletedCount: 0, deletedIds: [] as string[] };
      }
      await ctx.db.sprint.deleteMany({ where: { id: { in: invalidIds } } });
      return { deletedCount: invalidIds.length, deletedIds: invalidIds };
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
