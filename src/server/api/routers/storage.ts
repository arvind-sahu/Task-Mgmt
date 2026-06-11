import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  createPresignedDownloadUrls,
  isAllowedTaskAttachmentKey,
  isAllowedUserImageKey,
  isS3Configured,
} from "~/server/storage/s3";

const objectKeySchema = z.string().min(1).max(512);

export const storageRouter = createTRPCRouter({
  status: protectedProcedure.query(() => ({
    configured: isS3Configured(),
  })),

  /**
   * Batch-resolve S3 object keys to short-lived presigned GET URLs.
   * Clients cache results locally — the server never proxies file bytes.
   */
  getDownloadUrls: protectedProcedure
    .input(
      z.object({
        keys: z.array(objectKeySchema).min(1).max(50),
      }),
    )
    .query(async ({ input }) => {
      if (!isS3Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "File storage is not configured on this server.",
        });
      }

      for (const key of input.keys) {
        if (
          !isAllowedUserImageKey(key) &&
          !isAllowedTaskAttachmentKey(key)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid storage key",
          });
        }
      }

      const urls = await createPresignedDownloadUrls(input.keys);
      return { urls };
    }),
});
