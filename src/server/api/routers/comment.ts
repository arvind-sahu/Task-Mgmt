import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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
        select: { projectId: true },
      });
      await assertProjectAccess(ctx.db, task.projectId, ctx.session.user.id);

      return ctx.db.comment.create({
        data: {
          body: input.body,
          taskId: input.taskId,
          authorId: ctx.session.user.id,
        },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
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
