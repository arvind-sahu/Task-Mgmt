import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ProjectRole } from "@prisma/client";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const createInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color, e.g. #6366F1")
    .optional(),
});

const updateInput = createInput.partial().extend({ id: z.string().cuid() });

export const projectRouter = createTRPCRouter({
  /** Lists every project the current user owns or is a member of. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.id, ctx.session.user.id);
      return ctx.db.project.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          owner: {
            select: { id: true, name: true, email: true, image: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          tags: true,
        },
      });
    }),

  /**
   * Create a project and automatically register the creator as the OWNER
   * member, in a single transaction so we never end up with an orphan project.
   */
  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            name: input.name,
            description: input.description,
            color: input.color,
            ownerId: userId,
          },
        });
        await tx.projectMember.create({
          data: { userId, projectId: project.id, role: ProjectRole.OWNER },
        });
        return project;
      });
    }),

  update: protectedProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      // Updating settings requires admin or owner.
      await assertProjectAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );
      const { id, ...data } = input;
      return ctx.db.project.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only the owner can delete the project entirely.
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        select: { ownerId: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (project.ownerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the project owner can delete this project",
        });
      }
      await ctx.db.project.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  // ---- Membership management --------------------------------------------

  addMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        email: z.string().email(),
        role: z.nativeEnum(ProjectRole).default(ProjectRole.MEMBER),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );

      const user = await ctx.db.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user with that email — they need to register first",
        });
      }

      // Idempotent: gracefully no-op if the user is already a member.
      return ctx.db.projectMember.upsert({
        where: {
          userId_projectId: { userId: user.id, projectId: input.projectId },
        },
        create: {
          userId: user.id,
          projectId: input.projectId,
          role: input.role,
        },
        update: { role: input.role },
      });
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        userId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );

      // Don't let admins remove the project owner — that's reserved for
      // project deletion.
      const project = await ctx.db.project.findUniqueOrThrow({
        where: { id: input.projectId },
        select: { ownerId: true },
      });
      if (project.ownerId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the project owner",
        });
      }

      await ctx.db.projectMember.delete({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          },
        },
      });
      return { ok: true };
    }),
});
