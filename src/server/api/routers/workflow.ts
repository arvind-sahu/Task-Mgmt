import { TRPCError } from "@trpc/server";
import { TaskStatus, type CompanyRole } from "@prisma/client";
import { z } from "zod";

import { assertProjectAccess } from "~/server/api/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { hasMinCompanyRole } from "~/server/company/permissions";
import {
  canCustomizeWorkflow,
  legacyStatusForProjectStatus,
} from "~/server/workflow/defaults";
import { backfillProjectWorkflow } from "~/server/workflow/seed";
import { loadProjectWorkflow } from "~/server/workflow/service";
import {
  assertStatusCreationAllowed,
  assertTransitionAllowed,
  validateWorkflowPayload,
} from "~/server/workflow/validation";

const statusInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  color: z.string().min(4).max(20),
  orderIndex: z.number().int().min(0),
  isInitial: z.boolean(),
  isTerminal: z.boolean(),
  legacyStatus: z.nativeEnum(TaskStatus).nullable().optional(),
});

const transitionInput = z.object({
  fromStatusId: z.string().min(1),
  toStatusId: z.string().min(1),
  requiresComment: z.boolean().optional(),
  requiresAttachment: z.boolean().optional(),
});

const updateWorkflowInput = z.object({
  projectId: z.string().cuid(),
  statuses: z.array(statusInput).min(2),
  transitions: z.array(transitionInput),
  creationLimit: z.number().int().min(2).max(5).optional(),
  allowCreationInAnyNonTerminal: z.boolean().optional(),
});

async function assertCanEditWorkflow(
  db: Parameters<typeof assertProjectAccess>[0],
  projectId: string,
  userId: string,
) {
  const role = await assertProjectAccess(db, projectId, userId, "ADMIN");

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      companyId: true,
      company: { select: { plan: true } },
    },
  });

  if (!canCustomizeWorkflow(project.company?.plan)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Custom workflows are available on Pro, Business, and Enterprise plans. Upgrade to customize.",
    });
  }

  if (project.companyId) {
    const membership = await db.companyMember.findUnique({
      where: {
        companyId_userId: { companyId: project.companyId, userId },
      },
      select: { role: true },
    });
    if (
      membership &&
      hasMinCompanyRole(membership.role as CompanyRole, "SUPER_ADMIN")
    ) {
      return role;
    }
  }

  if (role === "OWNER" || role === "ADMIN") return role;

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Only project admins can edit the workflow",
  });
}

export const workflowRouter = createTRPCRouter({
  byProject: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
      );
      await backfillProjectWorkflow(ctx.db, input.projectId);
      return loadProjectWorkflow(ctx.db, input.projectId);
    }),

  update: protectedProcedure
    .input(updateWorkflowInput)
    .mutation(async ({ ctx, input }) => {
      await assertCanEditWorkflow(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
      );

      validateWorkflowPayload(
        input.statuses as Array<{
          id?: string;
          name: string;
          color: string;
          orderIndex: number;
          isInitial: boolean;
          isTerminal: boolean;
          legacyStatus?: string | null;
        }>,
        input.transitions as Array<{
          fromStatusId: string;
          toStatusId: string;
          requiresComment?: boolean;
          requiresAttachment?: boolean;
        }>,
      );

      const existingStatuses = await ctx.db.projectStatus.findMany({
        where: { projectId: input.projectId },
        select: { id: true },
      });
      const existingIds = new Set(existingStatuses.map((s) => s.id));

      for (const status of input.statuses) {
        if (status.id && existingIds.has(status.id)) {
          const taskCount = await ctx.db.task.count({
            where: { statusId: status.id },
          });
          const prev = await ctx.db.projectStatus.findUnique({
            where: { id: status.id },
            select: { isTerminal: true },
          });
          if (prev?.isTerminal && !status.isTerminal && taskCount > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot unmark terminal while tasks remain in "${status.name}"`,
            });
          }
        }
      }

      const removedIds = [...existingIds].filter(
        (id) => !input.statuses.some((s) => s.id === id),
      );
      for (const removedId of removedIds) {
        const count = await ctx.db.task.count({ where: { statusId: removedId } });
        if (count > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Move or delete tasks first before removing a status",
          });
        }
      }

      await ctx.db.$transaction(async (tx) => {
        if (input.creationLimit !== undefined) {
          await tx.project.update({
            where: { id: input.projectId },
            data: { workflowCreationLimit: input.creationLimit },
          });
        }
        if (input.allowCreationInAnyNonTerminal !== undefined) {
          await tx.project.update({
            where: { id: input.projectId },
            data: {
              workflowAllowCreationInAnyNonTerminal:
                input.allowCreationInAnyNonTerminal,
            },
          });
        }

        await tx.workflowTransition.deleteMany({
          where: { projectId: input.projectId },
        });

        for (const removedId of removedIds) {
          await tx.projectStatus.delete({ where: { id: removedId } });
        }

        // Avoid unique (projectId, orderIndex) violations while reordering.
        const survivingStatuses = await tx.projectStatus.findMany({
          where: { projectId: input.projectId },
          select: { id: true },
        });
        for (let i = 0; i < survivingStatuses.length; i++) {
          await tx.projectStatus.update({
            where: { id: survivingStatuses[i].id },
            data: { orderIndex: -(i + 1) },
          });
        }

        const idMap = new Map<string, string>();

        for (const status of input.statuses) {
          if (status.id && existingIds.has(status.id)) {
            await tx.projectStatus.update({
              where: { id: status.id },
              data: {
                name: status.name,
                color: status.color,
                orderIndex: status.orderIndex,
                isInitial: status.isInitial,
                isTerminal: status.isTerminal,
                legacyStatus: status.legacyStatus ?? null,
              },
            });
            idMap.set(status.id, status.id);
          } else {
            const created = await tx.projectStatus.create({
              data: {
                projectId: input.projectId,
                name: status.name,
                color: status.color,
                orderIndex: status.orderIndex,
                isInitial: status.isInitial,
                isTerminal: status.isTerminal,
                legacyStatus: status.legacyStatus ?? null,
              },
            });
            if (status.id) idMap.set(status.id, created.id);
          }
        }

        for (const transition of input.transitions) {
          const fromId =
            idMap.get(transition.fromStatusId) ?? transition.fromStatusId;
          const toId =
            idMap.get(transition.toStatusId) ?? transition.toStatusId;
          await tx.workflowTransition.create({
            data: {
              projectId: input.projectId,
              fromStatusId: fromId,
              toStatusId: toId,
              requiresComment: transition.requiresComment ?? false,
              requiresAttachment: transition.requiresAttachment ?? false,
            },
          });
        }

        const allStatuses = await tx.projectStatus.findMany({
          where: { projectId: input.projectId },
        });
        for (const row of allStatuses) {
          const legacy = legacyStatusForProjectStatus(
            row.legacyStatus,
            row.isTerminal,
          );
          await tx.task.updateMany({
            where: { projectId: input.projectId, statusId: row.id },
            data: { status: legacy },
          });
        }
      });

      return loadProjectWorkflow(ctx.db, input.projectId);
    }),
});

export {
  assertStatusCreationAllowed,
  assertTransitionAllowed,
  loadProjectWorkflow,
};
