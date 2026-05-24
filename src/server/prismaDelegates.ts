import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";

type NotificationDelegate = typeof db.notification;

/** Ensures Prisma was regenerated after adding Notification / ProjectInvite / LoginAudit. */
export function requireNotificationDelegate(): NotificationDelegate {
  if (typeof db.notification?.count !== "function") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Database client is out of date. Stop the dev server (Ctrl+C), run `npx prisma generate` and `npm run db:push`, then run `npm run dev` again.",
    });
  }
  return db.notification;
}
