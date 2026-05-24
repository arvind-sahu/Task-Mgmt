import type { NotificationType } from "@prisma/client";

type NotificationDb = {
  notification?: {
    create: (args: {
      data: {
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        link?: string;
      };
    }) => Promise<unknown>;
  };
};

export async function createNotification(
  database: NotificationDb,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  },
) {
  if (typeof database.notification?.create !== "function") {
    return;
  }
  return database.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
    },
  });
}

export async function notifyUsers(
  database: NotificationDb,
  userIds: string[],
  input: Omit<Parameters<typeof createNotification>[1], "userId">,
) {
  if (typeof database.notification?.create !== "function") {
    return;
  }
  const unique = [...new Set(userIds)].filter(Boolean);
  await Promise.all(
    unique.map((userId) => createNotification(database, { ...input, userId })),
  );
}
