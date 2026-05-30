import { TRPCError } from "@trpc/server";
import { InviteStatus, NotificationType, ProjectRole } from "@prisma/client";
import { z } from "zod";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createNotification } from "~/server/notifications";
import {
  sanitizeOptionalPlainText,
  sanitizePlainText,
} from "~/server/security/sanitize";

const INVITE_TTL_DAYS = 14;

type InviteCtx = {
  db: typeof import("~/server/db").db;
  session: { user: { id: string; email?: string | null } };
};

async function inviteMemberByEmail(
  ctx: InviteCtx,
  input: { projectId: string; email: string; role: ProjectRole },
) {
  await assertProjectAccess(
    ctx.db,
    input.projectId,
    ctx.session.user.id,
    ProjectRole.ADMIN,
  );

  if (input.role === ProjectRole.OWNER) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot invite someone as owner",
    });
  }

  const email = input.email.toLowerCase();
  const project = await ctx.db.project.findUniqueOrThrow({
    where: { id: input.projectId },
    select: { name: true },
  });

  const user = await ctx.db.user.findUnique({ where: { email } });
  if (user) {
    const member = await ctx.db.projectMember.upsert({
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

    await createNotification(ctx.db, {
      userId: user.id,
      type: NotificationType.PROJECT_INVITE,
      title: "Added to project",
      message: `You were added to "${project.name}"`,
      link: `/projects/${input.projectId}`,
    });

    return { kind: "member" as const, member };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const existingPending = await ctx.db.projectInvite.findFirst({
    where: {
      projectId: input.projectId,
      email,
      status: InviteStatus.PENDING,
    },
  });
  if (existingPending) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A pending invite already exists for this email",
    });
  }

  const invite = await ctx.db.projectInvite.create({
    data: {
      email,
      role: input.role,
      projectId: input.projectId,
      invitedById: ctx.session.user.id,
      expiresAt,
    },
  });

  return { kind: "invite" as const, invite };
}

const createInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color, e.g. #6366F1")
    .optional(),
  sprintDurationWeeks: z.union([z.literal(1), z.literal(2)]).optional(),
});

const updateInput = createInput.partial().extend({ id: z.string().cuid() });

export const projectRouter = createTRPCRouter({
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
      const currentUserRole = await assertProjectAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
      );
      const project = await ctx.db.project.findUniqueOrThrow({
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
          ...(currentUserRole === "OWNER" || currentUserRole === "ADMIN"
            ? {
                invites: {
                  where: { status: InviteStatus.PENDING },
                  orderBy: { createdAt: "desc" as const },
                },
              }
            : {}),
        },
      });
      return { ...project, currentUserRole };
    }),

  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            name: sanitizePlainText(input.name),
            description: sanitizeOptionalPlainText(input.description),
            color: input.color,
            sprintDurationWeeks: input.sprintDurationWeeks,
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
      await assertProjectAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );
      const { id, ...data } = input;
      const sanitized = {
        ...data,
        name: data.name ? sanitizePlainText(data.name) : undefined,
        description: sanitizeOptionalPlainText(data.description),
      };
      return ctx.db.project.update({ where: { id }, data: sanitized });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
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

  /** Invite by email — adds existing users or creates a pending invite. */
  inviteMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        email: z.string().email(),
        role: z.nativeEnum(ProjectRole).default(ProjectRole.MEMBER),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { projectId, email, role } = input;
      if (!projectId || !email || !role) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing required invite fields",
        });
      }
      return inviteMemberByEmail(ctx, { projectId, email, role });
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        email: z.string().email(),
        role: z.nativeEnum(ProjectRole).default(ProjectRole.MEMBER),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { projectId, email, role } = input;
      if (!projectId || !email || !role) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing required member fields",
        });
      }
      return inviteMemberByEmail(ctx, { projectId, email, role });
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.projectInvite.findUniqueOrThrow({
        where: { id: input.inviteId },
        include: { project: { select: { name: true } } },
      });

      const email = ctx.session.user.email?.toLowerCase();
      if (!email || invite.email !== email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite is not for your account",
        });
      }
      if (invite.status !== InviteStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite is no longer pending",
        });
      }
      if (invite.expiresAt < new Date()) {
        await ctx.db.projectInvite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.EXPIRED },
        });
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invite expired" });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.projectMember.upsert({
          where: {
            userId_projectId: {
              userId: ctx.session.user.id,
              projectId: invite.projectId,
            },
          },
          create: {
            userId: ctx.session.user.id,
            projectId: invite.projectId,
            role: invite.role,
          },
          update: { role: invite.role },
        });
        await tx.projectInvite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.ACCEPTED, respondedAt: new Date() },
        });
      });

      return { projectId: invite.projectId, projectName: invite.project.name };
    }),

  declineInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.projectInvite.findUniqueOrThrow({
        where: { id: input.inviteId },
      });
      const email = ctx.session.user.email?.toLowerCase();
      if (!email || invite.email !== email) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.projectInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.DECLINED, respondedAt: new Date() },
      });
      return { ok: true };
    }),

  myPendingInvites: protectedProcedure.query(async ({ ctx }) => {
    const email = ctx.session.user.email?.toLowerCase();
    if (!email) return [];
    return ctx.db.projectInvite.findMany({
      where: {
        email,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        invitedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
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

  cancelInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.projectInvite.findUniqueOrThrow({
        where: { id: input.inviteId },
        select: { projectId: true },
      });
      await assertProjectAccess(
        ctx.db,
        invite.projectId,
        ctx.session.user.id,
        ProjectRole.ADMIN,
      );
      await ctx.db.projectInvite.delete({ where: { id: input.inviteId } });
      return { ok: true };
    }),
});
