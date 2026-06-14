import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  assertProjectAccess,
  canManageProject,
  type ProjectRole,
} from "~/server/api/access";
import { publicUserSelect } from "~/server/api/userSelect";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  assertCanDeleteTimeLog,
  assertCanEditTimeLog,
  TIME_LOG_CSV_MAX_ROWS,
} from "~/server/timeLog/permissions";
import {
  sanitizeOptionalPlainText,
} from "~/server/security/sanitize";

const hoursInput = z
  .number()
  .min(0.01, "Minimum 0.01 hours")
  .max(999.99, "Maximum 999.99 hours per entry");

const dateRangeInput = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const timeLogInclude = {
  user: { select: publicUserSelect },
  task: {
    select: {
      id: true,
      title: true,
      projectId: true,
      project: { select: { id: true, name: true, color: true } },
    },
  },
} as const;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function buildDateFilter(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (from) filter.gte = startOfDay(from);
  if (to) filter.lte = endOfDay(to);
  return filter;
}

function hoursNumber(value: { hours: unknown }): number {
  return typeof value.hours === "object" && value.hours !== null && "toNumber" in value.hours
    ? (value.hours as { toNumber: () => number }).toNumber()
    : Number(value.hours);
}

function sumHours(logs: Array<{ hours: unknown }>): number {
  return logs.reduce((sum, log) => sum + hoursNumber(log), 0);
}

function toCsvRow(values: string[]): string {
  return values
    .map((v) => {
      const escaped = v.replace(/"/g, '""');
      return `"${escaped}"`;
    })
    .join(",");
}

export const timeLogRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string().cuid(),
        hours: hoursInput,
        logDate: z.coerce.date().optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUniqueOrThrow({
        where: { id: input.taskId },
        select: { projectId: true },
      });
      await assertProjectAccess(
        ctx.db,
        task.projectId,
        ctx.session.user.id,
        "MEMBER",
      );

      const logDate = startOfDay(input.logDate ?? new Date());

      return ctx.db.timeLog.create({
        data: {
          hours: input.hours,
          logDate,
          description: sanitizeOptionalPlainText(input.description),
          userId: ctx.session.user.id,
          taskId: input.taskId,
        },
        include: timeLogInclude,
      });
    }),

  listByTask: protectedProcedure
    .input(z.object({ taskId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUniqueOrThrow({
        where: { id: input.taskId },
        select: { projectId: true },
      });
      const role = await assertProjectAccess(
        ctx.db,
        task.projectId,
        ctx.session.user.id,
      );

      const where = {
        taskId: input.taskId,
        ...(canManageProject(role)
          ? {}
          : { userId: ctx.session.user.id }),
      };

      const logs = await ctx.db.timeLog.findMany({
        where,
        include: timeLogInclude,
        orderBy: [{ logDate: "desc" }, { createdAt: "desc" }],
      });

      return {
        logs,
        totalHours: sumHours(logs),
        canManage: canManageProject(role),
      };
    }),

  listByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        userId: z.string().cuid().optional(),
        taskSearch: z.string().max(200).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const role = await assertProjectAccess(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
        "ADMIN",
      );

      const search = input.taskSearch?.trim();
      const logs = await ctx.db.timeLog.findMany({
        where: {
          task: {
            projectId: input.projectId,
            ...(search
              ? { title: { contains: search, mode: "insensitive" } }
              : {}),
          },
          ...(input.userId ? { userId: input.userId } : {}),
          ...(buildDateFilter(input.from, input.to)
            ? { logDate: buildDateFilter(input.from, input.to) }
            : {}),
        },
        include: timeLogInclude,
        orderBy: [{ logDate: "desc" }, { createdAt: "desc" }],
        take: TIME_LOG_CSV_MAX_ROWS,
      });

      const byUser = new Map<string, { userId: string; name: string; hours: number }>();
      for (const log of logs) {
        const key = log.userId;
        const prev = byUser.get(key);
        const h = hoursNumber(log);
        const name = log.user.name ?? log.user.email ?? "Unknown";
        if (prev) prev.hours += h;
        else byUser.set(key, { userId: key, name, hours: h });
      }

      return {
        logs,
        role,
        totalHours: sumHours(logs),
        perUser: Array.from(byUser.values()).sort((a, b) => b.hours - a.hours),
      };
    }),

  myLogs: protectedProcedure
    .input(
      dateRangeInput.extend({
        taskSearch: z.string().max(200).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const search = input?.taskSearch?.trim();

      const logs = await ctx.db.timeLog.findMany({
        where: {
          userId,
          ...(buildDateFilter(input?.from, input?.to)
            ? { logDate: buildDateFilter(input?.from, input?.to) }
            : {}),
          ...(search
            ? {
                task: {
                  title: { contains: search, mode: "insensitive" },
                },
              }
            : {}),
        },
        include: timeLogInclude,
        orderBy: [{ logDate: "desc" }, { createdAt: "desc" }],
        take: TIME_LOG_CSV_MAX_ROWS,
      });

      const byTask = new Map<
        string,
        { taskId: string; title: string; projectName: string; hours: number; logs: typeof logs }
      >();
      for (const log of logs) {
        const key = log.taskId;
        const h = hoursNumber(log);
        const group = byTask.get(key);
        if (group) {
          group.hours += h;
          group.logs.push(log);
        } else {
          byTask.set(key, {
            taskId: key,
            title: log.task.title,
            projectName: log.task.project.name,
            hours: h,
            logs: [log],
          });
        }
      }

      return {
        logs,
        totalHours: sumHours(logs),
        byTask: Array.from(byTask.values()),
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        hours: hoursInput.optional(),
        logDate: z.coerce.date().optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.timeLog.findUniqueOrThrow({
        where: { id: input.id },
        include: { task: { select: { projectId: true } } },
      });
      const role = await assertProjectAccess(
        ctx.db,
        existing.task.projectId,
        ctx.session.user.id,
      );
      assertCanEditTimeLog(
        role,
        ctx.session.user.id,
        existing.userId,
        existing.createdAt,
      );

      return ctx.db.timeLog.update({
        where: { id: input.id },
        data: {
          hours: input.hours,
          logDate: input.logDate ? startOfDay(input.logDate) : undefined,
          description:
            input.description !== undefined
              ? sanitizeOptionalPlainText(input.description)
              : undefined,
        },
        include: timeLogInclude,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.timeLog.findUniqueOrThrow({
        where: { id: input.id },
        include: { task: { select: { projectId: true } } },
      });
      const role = await assertProjectAccess(
        ctx.db,
        existing.task.projectId,
        ctx.session.user.id,
      );
      assertCanDeleteTimeLog(role, ctx.session.user.id, existing.userId);

      await ctx.db.timeLog.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  exportMyCsv: protectedProcedure
    .input(dateRangeInput.optional())
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.timeLog.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(buildDateFilter(input?.from, input?.to)
            ? { logDate: buildDateFilter(input?.from, input?.to) }
            : {}),
        },
        include: timeLogInclude,
        orderBy: [{ logDate: "desc" }, { createdAt: "desc" }],
        take: TIME_LOG_CSV_MAX_ROWS,
      });

      const header = toCsvRow([
        "Date",
        "Project",
        "Task",
        "Hours",
        "Description",
      ]);
      const rows = logs.map((log) =>
        toCsvRow([
          new Date(log.logDate).toISOString().slice(0, 10),
          log.task.project.name,
          log.task.title,
          hoursNumber(log).toFixed(2),
          log.description ?? "",
        ]),
      );

      return {
        csv: [header, ...rows].join("\n"),
        rowCount: logs.length,
      };
    }),
});

export type { ProjectRole };
