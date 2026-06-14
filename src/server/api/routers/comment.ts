import { NotificationType } from "@prisma/client";
import { z } from "zod";

import { assertCanModifyTaskComment, assertProjectAccess } from "~/server/api/access";
import { publicUserSelect } from "~/server/api/userSelect";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifyMentionedUsers } from "~/server/mentions";
import { notifyUsers } from "~/server/notifications";
import { sanitizeRichTextHtml } from "~/server/security/sanitizeHtml";

async function actorDisplayName(
  db: Parameters<typeof notifyMentionedUsers>[0],
  userId: string,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return user?.name?.trim() || user?.email || "Someone";
}

export const commentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string().cuid(),
        body: z.string().min(1).max(12000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUniqueOrThrow({
        where: { id: input.taskId },
        select: {
          projectId: true,
          title: true,
          creatorId: true,
          assignees: { select: { id: true } },
        },
      });
      await assertProjectAccess(ctx.db, task.projectId, ctx.session.user.id);

      const sanitizedBody = sanitizeRichTextHtml(input.body);
      const comment = await ctx.db.comment.create({
        data: {
          body: sanitizedBody,
          taskId: input.taskId,
          authorId: ctx.session.user.id,
        },
        include: {
          author: { select: publicUserSelect },
          attachments: true,
        },
      });

      const authorId = ctx.session.user.id;
      const recipientIds = [
        task.creatorId,
        ...task.assignees.map((a) => a.id),
      ].filter((id) => id !== authorId);

      await notifyUsers(ctx.db, recipientIds, {
        type: NotificationType.TASK_COMMENT,
        title: "New comment",
        message: `On task "${task.title}"`,
        link: `/tasks/${input.taskId}`,
      });

      const actorName = await actorDisplayName(ctx.db, authorId);
      await notifyMentionedUsers(ctx.db, {
        html: sanitizedBody,
        actorId: authorId,
        actorName,
        taskId: input.taskId,
        taskTitle: task.title,
        projectId: task.projectId,
        contextLabel: "comment",
      });

      return comment;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        body: z.string().min(1).max(12000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          authorId: true,
          body: true,
          task: {
            select: { projectId: true, id: true, title: true },
          },
        },
      });

      await assertCanModifyTaskComment(
        ctx.db,
        ctx.session.user.id,
        comment.authorId,
        comment.task.projectId,
      );

      const sanitizedBody = sanitizeRichTextHtml(input.body);
      const updated = await ctx.db.comment.update({
        where: { id: input.id },
        data: { body: sanitizedBody },
        include: {
          author: { select: publicUserSelect },
          attachments: true,
        },
      });

      const actorName = await actorDisplayName(ctx.db, ctx.session.user.id);
      await notifyMentionedUsers(ctx.db, {
        html: sanitizedBody,
        previousHtml: comment.body,
        actorId: ctx.session.user.id,
        actorName,
        taskId: comment.task.id,
        taskTitle: comment.task.title,
        projectId: comment.task.projectId,
        contextLabel: "comment",
      });

      return updated;
    }),

  /** Authors, project owners, and company super admins may delete comments. */
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          authorId: true,
          task: { select: { projectId: true } },
        },
      });

      await assertCanModifyTaskComment(
        ctx.db,
        ctx.session.user.id,
        comment.authorId,
        comment.task.projectId,
      );

      await ctx.db.comment.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
