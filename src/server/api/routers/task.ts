import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { NotificationType, TaskPriority, TaskStatus } from "@prisma/client";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifyUsers } from "~/server/notifications";

const baseInput = {
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  deadline: z.coerce.date().nullable().optional(),
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
  search: z.string().optional(),
});

const includeShape = {
  assignees: {
    select: { id: true, name: true, email: true, image: true },
  },
  tags: true,
  creator: {
    select: { id: true, name: true, email: true, image: true },
  },
  _count: { select: { comments: true } },
} as const;

export const taskRouter = createTRPCRouter({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    await assertProjectAccess(ctx.db, input.projectId, ctx.session.user.id);

    return ctx.db.task.findMany({
      where: {
        projectId: input.projectId,
        status: input.status,
        priority: input.priority,
        assignees: input.assigneeId
          ? { some: { id: input.assigneeId } }
          : undefined,
        OR: input.search
          ? [
              { title: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: includeShape,
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
      } = input;
      if (!projectId || !title) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing required task fields",
        });
      }
      await assertProjectAccess(ctx.db, projectId, ctx.session.user.id);

      const task = await ctx.db.task.create({
        data: {
          title,
          description,
          status,
          priority,
          deadline,
          project: { connect: { id: projectId } },
          creator: { connect: { id: ctx.session.user.id } },
          assignees: assigneeIds
            ? { connect: assigneeIds.map((id) => ({ id })) }
            : undefined,
          tags: tagIds ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        },
        include: includeShape,
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
      await assertProjectAccess(
        ctx.db,
        existing.projectId,
        ctx.session.user.id,
      );

      const { id, assigneeIds, tagIds, ...rest } = input;

      const updated = await ctx.db.task.update({
        where: { id },
        data: {
          ...rest,
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
      const existing = await ctx.db.task.findUniqueOrThrow({
        where: { id: input.id },
        select: { projectId: true },
      });
      await assertProjectAccess(
        ctx.db,
        existing.projectId,
        ctx.session.user.id,
      );
      return ctx.db.task.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.task.findUniqueOrThrow({
        where: { id: input.id },
        select: { projectId: true },
      });
      await assertProjectAccess(
        ctx.db,
        existing.projectId,
        ctx.session.user.id,
      );
      await ctx.db.task.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
