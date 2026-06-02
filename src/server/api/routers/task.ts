import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { NotificationType, TaskPriority, TaskStatus } from "@prisma/client";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifyUsers } from "~/server/notifications";
import {
  sanitizeOptionalPlainText,
  sanitizePlainText,
} from "~/server/security/sanitize";

const baseInput = {
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  deadline: z.coerce.date().nullable().optional(),
  sprintId: z.string().cuid().nullable().optional(),
  assigneeIds: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
};

const createInput = z.object({
  projectId: z.string().cuid(),
  ...baseInput,
});

const updateInput = z.object({
  id: z.string().cuid(),
  ...baseInput,
});

const listInput = z.object({
  projectId: z.string().cuid(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().cuid().optional(),
  tagId: z.string().cuid().optional(),
  sprintId: z.string().cuid().nullable().optional(),
  backlog: z.boolean().optional(),
  search: z.string().optional(),
});

const assigneeSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

/** Board/list views — omit creator + sprint joins (sprintId is on the row). */
const listIncludeShape = {
  assignees: { select: assigneeSelect },
  tags: true,
  _count: { select: { comments: true } },
} as const;

const includeShape = {
  assignees: { select: assigneeSelect },
  tags: true,
  creator: { select: assigneeSelect },
  sprint: true,
  _count: { select: { comments: true } },
} as const;

type TaskDb = Parameters<typeof assertProjectAccess>[0];

function projectMemberFilter(userId: string) {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

async function assertSprintBelongsToProject(
  db: TaskDb,
  sprintId: string,
  projectId: string,
) {
  const sprint = await db.sprint.findUniqueOrThrow({
    where: { id: sprintId },
    select: { projectId: true },
  });
  if (sprint.projectId !== projectId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sprint does not belong to this project",
    });
  }
}

async function assertTaskMutationPreconditions(
  db: TaskDb,
  projectId: string,
  userId: string,
  options: { assigneeIds?: string[]; sprintId?: string | null } = {},
) {
  await assertProjectAccess(db, projectId, userId);
  await Promise.all([
    assertAssigneesBelongToProject(db, projectId, options.assigneeIds),
    options.sprintId
      ? assertSprintBelongsToProject(db, options.sprintId, projectId)
      : Promise.resolve(),
  ]);
}

async function assertAssigneesBelongToProject(
  db: Parameters<typeof assertProjectAccess>[0],
  projectId: string,
  assigneeIds?: string[],
) {
  if (!assigneeIds?.length) return;

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: {
        where: { userId: { in: assigneeIds } },
        select: { userId: true },
      },
    },
  });
  const projectUserIds = new Set([
    project.ownerId,
    ...project.members.map((member) => member.userId),
  ]);
  const invalidAssignee = assigneeIds.find((id) => !projectUserIds.has(id));

  if (invalidAssignee) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tasks can only be assigned to project members",
    });
  }
}

export const taskRouter = createTRPCRouter({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    return ctx.db.task.findMany({
      where: {
        projectId: input.projectId,
        project: projectMemberFilter(userId),
        status: input.status,
        priority: input.priority,
        sprintId:
          input.backlog === true
            ? null
            : input.sprintId === undefined
              ? undefined
              : input.sprintId,
        assignees: input.assigneeId
          ? { some: { id: input.assigneeId } }
          : undefined,
        tags: input.tagId ? { some: { id: input.tagId } } : undefined,
        OR: input.search
          ? [
              { title: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: listIncludeShape,
      // Order by deadline (nulls last), then priority, then most recent.
      orderBy: [
        { deadline: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          ...includeShape,
          comments: {
            include: {
              author: {
                select: { id: true, name: true, email: true, image: true },
              },
              attachments: true,
            },
            orderBy: { createdAt: "asc" },
          },
          attachments: {
            where: { commentId: null },
            orderBy: { createdAt: "asc" },
          },
          project: { select: { id: true, name: true, color: true } },
        },
      });
      await assertProjectAccess(ctx.db, task.projectId, ctx.session.user.id);
      return task;
    }),

  /** Recent tasks across every project the user has access to (for the dashboard). */
  myUpcoming: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.task.findMany({
      where: {
        status: { not: TaskStatus.DONE },
        OR: [
          { assignees: { some: { id: userId } } },
          { creatorId: userId },
        ],
        project: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      },
      include: {
        ...includeShape,
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [
        { deadline: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: 25,
    });
  }),

  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const {
        projectId,
        assigneeIds,
        tagIds,
        title,
        description,
        status,
        priority,
        deadline,
        sprintId,
      } = input;
      if (!projectId || !title) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing required task fields",
        });
      }
      await assertTaskMutationPreconditions(
        ctx.db,
        projectId,
        ctx.session.user.id,
        { assigneeIds, sprintId },
      );
      const resolvedStatus = status ?? TaskStatus.BACKLOG;

      const task = await ctx.db.task.create({
        data: {
          title: sanitizePlainText(title),
          description: sanitizeOptionalPlainText(description),
          status: sprintId ? resolvedStatus : TaskStatus.BACKLOG,
          priority,
          deadline,
          sprint: sprintId ? { connect: { id: sprintId } } : undefined,
          project: { connect: { id: projectId } },
          creator: { connect: { id: ctx.session.user.id } },
          assignees: assigneeIds
            ? { connect: assigneeIds.map((id) => ({ id })) }
            : undefined,
          tags: tagIds ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        },
        include: listIncludeShape,
      });

      if (assigneeIds?.length) {
        const others = assigneeIds.filter((id) => id !== ctx.session.user.id);
        await notifyUsers(ctx.db, others, {
          type: NotificationType.TASK_ASSIGNED,
          title: "Task assigned to you",
          message: task.title,
          link: `/tasks/${task.id}`,
        });
      }

      return task;
    }),

  update: protectedProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.task.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          projectId: true,
          title: true,
          assignees: { select: { id: true } },
        },
      });
      const { id, assigneeIds, tagIds, sprintId, ...rest } = input;
      await assertTaskMutationPreconditions(
        ctx.db,
        existing.projectId,
        ctx.session.user.id,
        { assigneeIds, sprintId },
      );

      const sanitizedRest = {
        ...rest,
        title: rest.title ? sanitizePlainText(rest.title) : undefined,
        description: sanitizeOptionalPlainText(rest.description),
      };

      const updated = await ctx.db.task.update({
        where: { id },
        data: {
          ...sanitizedRest,
          status: sprintId === null ? TaskStatus.BACKLOG : sanitizedRest.status,
          sprint:
            sprintId === undefined
              ? undefined
              : sprintId
                ? { connect: { id: sprintId } }
                : { disconnect: true },
          // `set` (rather than connect) so updates fully replace the lists,
          // matching what a typical "edit task" UI expects.
          assignees: assigneeIds
            ? { set: assigneeIds.map((aid) => ({ id: aid })) }
            : undefined,
          tags: tagIds ? { set: tagIds.map((tid) => ({ id: tid })) } : undefined,
        },
        include: includeShape,
      });

      if (assigneeIds) {
        const prevIds = new Set(existing.assignees.map((a) => a.id));
        const newlyAssigned = assigneeIds.filter(
          (aid) => !prevIds.has(aid) && aid !== ctx.session.user.id,
        );
        if (newlyAssigned.length) {
          await notifyUsers(ctx.db, newlyAssigned, {
            type: NotificationType.TASK_ASSIGNED,
            title: "Task assigned to you",
            message: existing.title,
            link: `/tasks/${id}`,
          });
        }
      }

      return updated;
    }),

  /** Quick column-drag style status change. */
  setStatus: protectedProcedure
    .input(
      z.object({ id: z.string().cuid(), status: z.nativeEnum(TaskStatus) }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const updated = await ctx.db.task.updateMany({
        where: {
          id: input.id,
          project: projectMemberFilter(userId),
        },
        data: { status: input.status },
      });
      if (updated.count === 0) {
        const task = await ctx.db.task.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        throw new TRPCError({
          code: task ? "FORBIDDEN" : "NOT_FOUND",
          message: task
            ? "You are not a member of this project"
            : "Task not found",
        });
      }
      return { id: input.id, status: input.status };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const deleted = await ctx.db.task.deleteMany({
        where: {
          id: input.id,
          project: projectMemberFilter(userId),
        },
      });
      if (deleted.count === 0) {
        const task = await ctx.db.task.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        throw new TRPCError({
          code: task ? "FORBIDDEN" : "NOT_FOUND",
          message: task
            ? "You are not a member of this project"
            : "Task not found",
        });
      }
      return { ok: true };
    }),
});
