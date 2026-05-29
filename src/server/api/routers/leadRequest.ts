import { z } from "zod";

import { createLeadRequest, updateLeadRequestStatus } from "~/server/leadRequest";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const leadRequestRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        type: z.enum(["DEMO_REQUEST", "CONTACT_SALES", "NEWSLETTER_SIGNUP"]),
        fullName: z.string().min(2).max(120).optional(),
        workEmail: z.string().email(),
        companyRole: z.string().max(140).optional(),
        companySize: z.string().max(80).optional(),
        message: z.string().max(4000).optional(),
        source: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { type, workEmail, fullName, companyRole, companySize, message, source } =
        input;
      if (!type || !workEmail) {
        throw new Error("Missing required lead request fields");
      }
      const lead = await createLeadRequest({
        type,
        workEmail,
        fullName,
        companyRole,
        companySize,
        message,
        source,
      });
      return {
        requestId: lead.requestId,
        status: lead.status,
        emailStatus: lead.emailStatus,
        createdAt: lead.createdAt,
      };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        requestId: z.string().regex(/^\d{10}$/, "Request id must be a 10-digit number"),
        status: z.enum(["NEW", "IN_PROGRESS", "CONTACTED", "CLOSED"]),
      }),
    )
    .mutation(async ({ input }) => {
      const { requestId, status } = input;
      if (!requestId || !status) {
        throw new Error("Missing required lead status fields");
      }
      return updateLeadRequestStatus({ requestId, status });
    }),
});
