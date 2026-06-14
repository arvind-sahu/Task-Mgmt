import { attachmentRouter } from "~/server/api/routers/attachment";
import { companyRouter } from "~/server/api/routers/company";
import { commentRouter } from "~/server/api/routers/comment";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { leadRequestRouter } from "~/server/api/routers/leadRequest";
import { notificationRouter } from "~/server/api/routers/notification";
import { projectRouter } from "~/server/api/routers/project";
import { sprintRouter } from "~/server/api/routers/sprint";
import { tagRouter } from "~/server/api/routers/tag";
import { storageRouter } from "~/server/api/routers/storage";
import { taskRouter } from "~/server/api/routers/task";
import { userRouter } from "~/server/api/routers/user";
import { timeLogRouter } from "~/server/api/routers/timeLog";
import { workflowRouter } from "~/server/api/routers/workflow";
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
  company: companyRouter,
  user: userRouter,
  project: projectRouter,
  sprint: sprintRouter,
  task: taskRouter,
  tag: tagRouter,
  comment: commentRouter,
  attachment: attachmentRouter,
  storage: storageRouter,
  notification: notificationRouter,
  dashboard: dashboardRouter,
  leadRequest: leadRequestRouter,
  workflow: workflowRouter,
  timeLog: timeLogRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
