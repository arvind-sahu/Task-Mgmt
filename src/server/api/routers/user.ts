import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// Reusable input shapes — exported so tests can import the same schemas.
export const registerInput = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72), // bcrypt's effective max is 72 bytes
});

export const updateProfileInput = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().max(64).optional(),
  image: z.string().url().optional().nullable(),
});

export const userRouter = createTRPCRouter({
  /** Public registration endpoint. Hashes the password with bcrypt. */
  register: publicProcedure
    .input(registerInput)
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await ctx.db.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email,
          password: passwordHash,
        },
        select: { id: true, email: true, name: true },
      });
      return user;
    }),

  /** Returns the currently signed-in user (no password). */
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        timezone: true,
        createdAt: true,
      },
    });
  }),

  updateProfile: protectedProcedure
    .input(updateProfileInput)
    .mutation(({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          timezone: true,
        },
      });
    }),

  /**
   * Lightweight directory used by the assignee/member pickers. Scoped to a
   * search query and capped at 20 results so we don't leak the full user
   * table in a single round-trip.
   */
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(80) }))
    .query(({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: {
          OR: [
            { email: { contains: input.query, mode: "insensitive" } },
            { name: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, image: true },
        take: 20,
      });
    }),
});
