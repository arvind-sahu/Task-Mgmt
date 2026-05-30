import { z } from "zod";
import { ProjectRole } from "@prisma/client";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sanitizePlainText } from "~/server/security/sanitize";

export const tagRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.session.user.id);
      return ctx.db.tag.findMany({
        where: { projectId: input.projectId },
        orderBy: { name: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        name: z.string().min(1).max(40),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
        ProjectRole.MEMBER,
      );
      return ctx.db.tag.create({
        data: {
          projectId: input.projectId,
          name: sanitizePlainText(input.name),
          color: input.color,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.db.tag.findUniqueOrThrow({
        where: { id: input.id },
        select: { projectId: true },
      });
      await assertProjectAccess(
        ctx.db,
        tag.projectId,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );
      await ctx.db.tag.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
