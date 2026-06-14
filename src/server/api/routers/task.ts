import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { NotificationType, TaskPriority, TaskStatus } from "@prisma/client";

import { assertProjectAccess } from "~/server/api/access";
import { publicUserSelect } from "~/server/api/userSelect";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifyMentionedUsers } from "~/server/mentions";
import { notifyUsers } from "~/server/notifications";
import {
  sanitizeOptionalPlainText,
  sanitizePlainText,
} from "~/server/security/sanitize";
import { sanitizeOptionalRichTextHtml } from "~/server/security/sanitizeHtml";
import { backfillProjectWorkflow } from "~/server/workflow/seed";
import { legacyStatusForProjectStatus } from "~/server/workflow/defaults";
import {
  assertStatusCreationAllowed,
  assertTransitionAllowed,
  loadProjectWorkflow,
} from "~/server/api/routers/workflow";

const baseInput = {
  title: z.string().min(1).max(200),
  description: z.string().max(20000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  statusId: z.string().cuid().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  deadline: z.coerce.date().nullable().optional(),
  sprintId: z.string().cuid().nullable().optional(),
  assigneeIds: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
  transitionComment: z.string().max(2000).optional(),
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

const assigneeSelect = publicUserSelect;

/** Board/list views — omit creator + sprint joins (sprintId is on the row). */
const listIncludeShape = {
  assignees: { select: assigneeSelect },
  tags: true,
  projectStatus: {
    select: {
      id: true,
      name: true,
      color: true,
      orderIndex: true,
      isInitial: true,
      isTerminal: true,
      legacyStatus: true,
    },
  },
  _count: { select: { comments: true, attachments: true } },
} as const;

const includeShape = {
  assignees: { select: assigneeSelect },
  tags: true,
  creator: { select: assigneeSelect },
  sprint: true,
  projectStatus: {
    select: {
      id: true,
      name: true,
      color: true,
      orderIndex: true,
      isInitial: true,
      isTerminal: true,
      legacyStatus: true,
    },
  },
  _count: { select: { comments: true, attachments: true } },
} as const;

type TaskDb = Parameters<typeof assertProjectAccess>[0];

/** Prisma relation-style write for workflow status (not raw `statusId`). */
function taskStatusWrite(statusId: string, status: TaskStatus) {
  return {
    status,
    projectStatus: { connect: { id: statusId } },
  };
}

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

async function taskHasAttachments(db: TaskDb, taskId: string): Promise<boolean> {
  const direct = await db.taskAttachment.count({ where: { taskId } });
  if (direct > 0) return true;
  const viaComment = await db.taskAttachment.count({
    where: { comment: { taskId } },
  });
  return viaComment > 0;
}

async function ensureProjectWorkflow(db: TaskDb, projectId: string) {
  await backfillProjectWorkflow(db, projectId);
  return loadProjectWorkflow(db, projectId);
}

async function resolveStatusIdForCreate(
  db: TaskDb,
  projectId: string,
  statusId?: string,
  status?: TaskStatus,
  sprintId?: string | null,
) {
  const workflow = await ensureProjectWorkflow(db, projectId);
  let resolvedId: string | undefined = statusId;

  if (!resolvedId && status) {
    const match = workflow.statuses.find((s) => s.legacyStatus === status);
    resolvedId = match?.id;
  }

  if (!resolvedId) {
    const backlog = workflow.statuses.find(
      (s) => s.legacyStatus === TaskStatus.BACKLOG,
    );
    resolvedId =
      workflow.creationAllowedStatusIds[0] ??
      backlog?.id ??
      workflow.statuses[0]?.id;
  }

  if (!resolvedId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Project workflow is not configured",
    });
  }

  assertStatusCreationAllowed(
    resolvedId,
    workflow.statuses,
    workflow.settings,
  );

  const row = workflow.statuses.find((s) => s.id === resolvedId)!;
  const legacy = legacyStatusForProjectStatus(
    row.legacyStatus as TaskStatus | null,
    row.isTerminal,
  );

  return {
    statusId: resolvedId,
    status: sprintId ? legacy : TaskStatus.BACKLOG,
  };
}

async function resolveStatusChange(
  db: TaskDb,
  projectId: string,
  currentStatusId: string | null,
  options: {
    statusId?: string;
    status?: TaskStatus;
    transitionComment?: string;
    taskId: string;
  },
) {
  const workflow = await ensureProjectWorkflow(db, projectId);
  let nextStatusId = options.statusId;

  if (!nextStatusId && options.status) {
    const match = workflow.statuses.find(
      (s) => s.legacyStatus === options.status,
    );
    nextStatusId = match?.id;
  }

  if (!nextStatusId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Status is required",
    });
  }

  if (currentStatusId && currentStatusId !== nextStatusId) {
    const hasAttachments = await taskHasAttachments(db, options.taskId);
    assertTransitionAllowed(
      currentStatusId,
      nextStatusId,
      workflow.transitions,
      {
        transitionComment: options.transitionComment,
        hasAttachments,
      },
    );
  }

  const row = workflow.statuses.find((s) => s.id === nextStatusId);
  if (!row) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid status" });
  }

  return {
    statusId: nextStatusId,
    status: legacyStatusForProjectStatus(
      row.legacyStatus as TaskStatus | null,
      row.isTerminal,
    ),
  };
}

type TaskWithMetaCounts = {
  id: string;
  _count: { comments: number; attachments: number };
};

/** Include comment attachments in task attachment totals for board badges. */
async function enrichTasksWithAttachmentTotals<T extends TaskWithMetaCounts>(
  db: TaskDb,
  tasks: T[],
): Promise<T[]> {
  if (tasks.length === 0) return tasks;

  const taskIds = tasks.map((task) => task.id);
  const linkedAttachments = await db.taskAttachment.findMany({
    where: {
      OR: [
        { taskId: { in: taskIds } },
        { comment: { taskId: { in: taskIds } } },
      ],
    },
    select: {
      taskId: true,
      comment: { select: { taskId: true } },
    },
  });

  const attachmentTotals = new Map<string, number>();
  for (const att of linkedAttachments) {
    const ownerTaskId = att.taskId ?? att.comment?.taskId;
    if (!ownerTaskId) continue;
    attachmentTotals.set(
      ownerTaskId,
      (attachmentTotals.get(ownerTaskId) ?? 0) + 1,
    );
  }

  return tasks.map((task) => ({
    ...task,
    _count: {
      ...task._count,
      attachments: attachmentTotals.get(task.id) ?? task._count.attachments,
    },
  }));
}

export const taskRouter = createTRPCRouter({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    const tasks = await ctx.db.task.findMany({
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
      orderBy: [
        { deadline: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });

    return enrichTasksWithAttachmentTotals(ctx.db, tasks);
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
      const viewerProjectRole = await assertProjectAccess(
        ctx.db,
        task.projectId,
        ctx.session.user.id,
      );
      return { ...task, viewerProjectRole };
    }),

  /** Recent tasks across every project the user has access to (for the dashboard). */
  myUpcoming: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const tasks = await ctx.db.task.findMany({
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
    return enrichTasksWithAttachmentTotals(ctx.db, tasks);
  }),

  /** All open tasks assigned to the current user (My Tasks page). */
  myTasks: protectedProcedure
    .input(
      z
        .object({
          search: z.string().max(200).optional(),
          includeDone: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const search = input?.search?.trim();

      const tasks = await ctx.db.task.findMany({
        where: {
          assignees: { some: { id: userId } },
          status: input?.includeDone ? undefined : { not: TaskStatus.DONE },
          project: projectMemberFilter(userId),
          OR: search
            ? [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ]
            : undefined,
        },
        include: {
          ...listIncludeShape,
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: [
          { deadline: { sort: "asc", nulls: "last" } },
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        take: 100,
      });
      return enrichTasksWithAttachmentTotals(ctx.db, tasks);
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

      const resolved = await resolveStatusIdForCreate(
        ctx.db,
        projectId,
        input.statusId,
        status,
        sprintId,
      );

      const task = await ctx.db.task.create({
        data: {
          title: sanitizePlainText(title),
          description: sanitizeOptionalRichTextHtml(description),
          ...taskStatusWrite(resolved.statusId, resolved.status),
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
          description: true,
          statusId: true,
          assignees: { select: { id: true } },
        },
      });
      const { id, assigneeIds, tagIds, sprintId, statusId, status, transitionComment, ...rest } = input;
      await assertTaskMutationPreconditions(
        ctx.db,
        existing.projectId,
        ctx.session.user.id,
        { assigneeIds, sprintId },
      );

      const sanitizedRest = {
        ...rest,
        title: rest.title ? sanitizePlainText(rest.title) : undefined,
        description: sanitizeOptionalRichTextHtml(rest.description),
      };

      let statusPatch: ReturnType<typeof taskStatusWrite> | undefined;
      if (statusId !== undefined || status !== undefined) {
        const resolved = await resolveStatusChange(
          ctx.db,
          existing.projectId,
          existing.statusId,
          {
            statusId,
            status,
            transitionComment,
            taskId: id,
          },
        );
        statusPatch = taskStatusWrite(resolved.statusId, resolved.status);
      }

      let backlogPatch: ReturnType<typeof taskStatusWrite> | undefined;
      if (sprintId === null) {
        const backlog = await resolveStatusIdForCreate(
          ctx.db,
          existing.projectId,
          undefined,
          TaskStatus.BACKLOG,
          null,
        );
        backlogPatch = taskStatusWrite(backlog.statusId, backlog.status);
      }

      const updated = await ctx.db.task.update({
        where: { id },
        data: {
          ...sanitizedRest,
          ...(backlogPatch ?? statusPatch),
          sprint:
            sprintId === undefined
              ? undefined
              : sprintId
                ? { connect: { id: sprintId } }
                : { disconnect: true },
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

      if (rest.description !== undefined && sanitizedRest.description) {
        const actor = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true, email: true },
        });
        const actorName =
          actor?.name?.trim() || actor?.email || "Someone";
        await notifyMentionedUsers(ctx.db, {
          html: sanitizedRest.description,
          previousHtml: existing.description,
          actorId: ctx.session.user.id,
          actorName,
          taskId: id,
          taskTitle: existing.title,
          projectId: existing.projectId,
          contextLabel: "description",
        });
      }

      return updated;
    }),

  /** Quick column-drag style status change. */
  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        statusId: z.string().cuid().optional(),
        status: z.nativeEnum(TaskStatus).optional(),
        transitionComment: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const task = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          project: projectMemberFilter(userId),
        },
        select: {
          id: true,
          projectId: true,
          statusId: true,
        },
      });

      if (!task) {
        const exists = await ctx.db.task.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        throw new TRPCError({
          code: exists ? "FORBIDDEN" : "NOT_FOUND",
          message: exists
            ? "You are not a member of this project"
            : "Task not found",
        });
      }

      const resolved = await resolveStatusChange(
        ctx.db,
        task.projectId,
        task.statusId,
        {
          statusId: input.statusId,
          status: input.status,
          transitionComment: input.transitionComment,
          taskId: task.id,
        },
      );

      await ctx.db.task.update({
        where: { id: task.id },
        data: taskStatusWrite(resolved.statusId, resolved.status),
      });

      return {
        id: task.id,
        status: resolved.status,
        statusId: resolved.statusId,
      };
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
