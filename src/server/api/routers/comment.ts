import { NotificationType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifyUsers } from "~/server/notifications";

export const commentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string().cuid(),
        body: z.string().min(1).max(2000),
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

      const comment = await ctx.db.comment.create({
        data: {
          body: input.body,
          taskId: input.taskId,
          authorId: ctx.session.user.id,
        },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
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

      return comment;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        body: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUniqueOrThrow({
        where: { id: input.id },
        select: { authorId: true, taskId: true },
      });
      if (comment.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own comments",
        });
      }

      const task = await ctx.db.task.findUniqueOrThrow({
        where: { id: comment.taskId },
        select: { projectId: true },
      });
      await assertProjectAccess(ctx.db, task.projectId, ctx.session.user.id);

      return ctx.db.comment.update({
        where: { id: input.id },
        data: { body: input.body },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          attachments: true,
        },
      });
    }),

  /** Authors can edit/delete their own comments. */
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUniqueOrThrow({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (comment.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }
      await ctx.db.comment.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
