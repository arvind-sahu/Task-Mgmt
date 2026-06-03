import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sanitizePlainText } from "~/server/security/sanitize";
import {
  createPresignedUploadUrl,
  deleteObjectByKey,
  isAllowedTaskAttachmentKey,
  isS3Configured,
  isTaskAttachmentKeyForUser,
  resolveLegacyAttachmentKey,
  taskAttachmentKey,
  uploadDataUrlToS3,
} from "~/server/storage/s3";
import { isAllowedAttachmentType } from "~/utils/attachments";

const dataUrlSchema = z
  .string()
  .min(1)
  .max(7_000_000)
  .refine(
    (v) => v.startsWith("data:image/") || v.startsWith("data:application/pdf"),
    "Invalid attachment data",
  );

const storageKeySchema = z.string().min(1).max(512);

async function resolveAttachmentStorage(
  userId: string,
  fileName: string,
  storageKey?: string,
  dataUrl?: string,
): Promise<{ storageKey: string | null; dataUrl: string | null }> {
  if (storageKey) {
    if (!isTaskAttachmentKeyForUser(storageKey, userId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Invalid attachment storage key",
      });
    }
    return { storageKey, dataUrl: null };
  }

  if (!dataUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Provide a storage key or attachment data",
    });
  }

  if (!isS3Configured()) {
    return { storageKey: null, dataUrl };
  }

  const key = taskAttachmentKey(userId, fileName);
  await uploadDataUrlToS3(dataUrl, key);
  return { storageKey: key, dataUrl: null };
}

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
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
        contentLength: z
          .number()
          .int()
          .positive()
          .max(5 * 1024 * 1024, "File must be 5MB or smaller"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAllowedAttachmentType(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only images and PDF files are allowed",
        });
      }
      if (!isS3Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "File storage is not configured on this server.",
        });
      }

      const key = taskAttachmentKey(ctx.session.user.id, input.fileName);
      return createPresignedUploadUrl(key, input.mimeType);
    }),

  createForTask: protectedProcedure
    .input(
      z
        .object({
          taskId: z.string().cuid(),
          fileName: z.string().min(1).max(255),
          mimeType: z.string().min(1).max(100),
          storageKey: storageKeySchema.optional(),
          dataUrl: dataUrlSchema.optional(),
        })
        .refine((value) => Boolean(value.storageKey ?? value.dataUrl), {
          message: "Provide a storage key or attachment data",
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

      const stored = await resolveAttachmentStorage(
        ctx.session.user.id,
        input.fileName,
        input.storageKey,
        input.dataUrl,
      );

      return ctx.db.taskAttachment.create({
        data: {
          taskId: input.taskId,
          fileName: sanitizePlainText(input.fileName),
          mimeType: input.mimeType,
          storageKey: stored.storageKey,
          dataUrl: stored.dataUrl,
          uploaderId: ctx.session.user.id,
        },
      });
    }),

  createForComment: protectedProcedure
    .input(
      z
        .object({
          commentId: z.string().cuid(),
          fileName: z.string().min(1).max(255),
          mimeType: z.string().min(1).max(100),
          storageKey: storageKeySchema.optional(),
          dataUrl: dataUrlSchema.optional(),
        })
        .refine((value) => Boolean(value.storageKey ?? value.dataUrl), {
          message: "Provide a storage key or attachment data",
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

      const stored = await resolveAttachmentStorage(
        ctx.session.user.id,
        input.fileName,
        input.storageKey,
        input.dataUrl,
      );

      return ctx.db.taskAttachment.create({
        data: {
          commentId: input.commentId,
          fileName: sanitizePlainText(input.fileName),
          mimeType: input.mimeType,
          storageKey: stored.storageKey,
          dataUrl: stored.dataUrl,
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

      if (isAllowedTaskAttachmentKey(att.storageKey ?? "")) {
        try {
          await deleteObjectByKey(att.storageKey!);
        } catch {
          // Best-effort cleanup.
        }
      } else {
        const legacyKey = resolveLegacyAttachmentKey(att);
        if (legacyKey) {
          try {
            await deleteObjectByKey(legacyKey);
          } catch {
            // Best-effort cleanup.
          }
        }
      }

      await ctx.db.taskAttachment.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
