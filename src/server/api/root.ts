import { commentRouter } from "~/server/api/routers/comment";
import { projectRouter } from "~/server/api/routers/project";
import { tagRouter } from "~/server/api/routers/tag";
import { taskRouter } from "~/server/api/routers/task";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * Primary tRPC router. Each sub-router groups a logical resource:
 *  - user:    auth/profile/search
 *  - project: CRUD + membership
 *  - task:    CRUD + status transitions
 *  - tag:     CRUD scoped to a project
 *  - comment: task-level discussion
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  project: projectRouter,
  task: taskRouter,
  tag: tagRouter,
  comment: commentRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
