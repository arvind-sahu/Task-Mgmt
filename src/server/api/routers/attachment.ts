import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sanitizePlainText } from "~/server/security/sanitize";
import { isAllowedAttachmentType } from "~/utils/attachments";

const dataUrlSchema = z
  .string()
  .min(1)
  .max(7_000_000)
  .refine(
    (v) => v.startsWith("data:image/") || v.startsWith("data:application/pdf"),
    "Invalid attachment data",
  );

async function assertTaskAccess(
  db: Parameters<typeof assertProjectAccess>[0],
  taskId: string,
  userId: string,
) {
  const task = await db.task.findUniqueOrThrow({
    where: { id: taskId },
    select: { projectId: true },
  });
  await assertProjectAccess(db, task.projectId, userId);
  return task;
}

export const attachmentRouter = createTRPCRouter({
  createForTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string().cuid(),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
        dataUrl: dataUrlSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAllowedAttachmentType(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only images and PDF files are allowed",
        });
      }
      await assertTaskAccess(ctx.db, input.taskId, ctx.session.user.id);

      return ctx.db.taskAttachment.create({
        data: {
          taskId: input.taskId,
          fileName: sanitizePlainText(input.fileName),
          mimeType: input.mimeType,
          dataUrl: input.dataUrl,
          uploaderId: ctx.session.user.id,
        },
      });
    }),

  createForComment: protectedProcedure
    .input(
      z.object({
        commentId: z.string().cuid(),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
        dataUrl: dataUrlSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAllowedAttachmentType(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only images and PDF files are allowed",
        });
      }
      const comment = await ctx.db.comment.findUniqueOrThrow({
        where: { id: input.commentId },
        select: { taskId: true },
      });
      await assertTaskAccess(ctx.db, comment.taskId, ctx.session.user.id);

      return ctx.db.taskAttachment.create({
        data: {
          commentId: input.commentId,
          fileName: sanitizePlainText(input.fileName),
          mimeType: input.mimeType,
          dataUrl: input.dataUrl,
          uploaderId: ctx.session.user.id,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const att = await ctx.db.taskAttachment.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          task: { select: { projectId: true } },
          comment: { select: { taskId: true } },
        },
      });

      const taskId = att.taskId ?? att.comment?.taskId;
      if (!taskId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Attachment not found" });
      }
      await assertTaskAccess(ctx.db, taskId, ctx.session.user.id);

      if (att.uploaderId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own attachments",
        });
      }

      await ctx.db.taskAttachment.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
