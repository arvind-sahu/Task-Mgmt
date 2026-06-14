import { NotificationType, type PrismaClient } from "@prisma/client";

import { env } from "~/env";
import { sendTaskMentionEmail } from "~/server/email/taskMentionEmail";
import { notifyUsers } from "~/server/notifications";
import {
  extractMentionedUserIds,
  richTextPlainPreview,
} from "~/utils/mentions";

export async function getProjectMentionableUserIds(
  db: PrismaClient,
  projectId: string,
  userIds: string[],
): Promise<string[]> {
  if (!userIds.length) return [];

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: {
        where: { userId: { in: userIds } },
        select: { userId: true },
      },
    },
  });

  if (!project) return [];

  const allowed = new Set(project.members.map((member) => member.userId));
  allowed.add(project.ownerId);

  return userIds.filter((id) => allowed.has(id));
}

export async function notifyMentionedUsers(
  db: PrismaClient,
  params: {
    html: string;
    previousHtml?: string | null;
    actorId: string;
    actorName: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    contextLabel: "comment" | "description";
  },
): Promise<void> {
  const mentioned = extractMentionedUserIds(params.html);
  const previouslyMentioned = new Set(
    extractMentionedUserIds(params.previousHtml ?? ""),
  );
  const newlyMentioned = mentioned.filter(
    (id) => !previouslyMentioned.has(id) && id !== params.actorId,
  );

  if (!newlyMentioned.length) return;

  const recipientIds = await getProjectMentionableUserIds(
    db,
    params.projectId,
    newlyMentioned,
  );
  if (!recipientIds.length) return;

  const link = `/tasks/${params.taskId}`;
  const summary = richTextPlainPreview(params.html);
  const baseUrl = env.NEXTAUTH_URL.replace(/\/$/, "");

  await notifyUsers(db, recipientIds, {
    type: NotificationType.TASK_MENTION,
    title: `${params.actorName} mentioned you`,
    message: `On task "${params.taskTitle}"`,
    link,
  });

  const users = await db.user.findMany({
    where: { id: { in: recipientIds } },
    select: { id: true, email: true, name: true },
  });

  await Promise.all(
    users.map(async (user) => {
      try {
        await sendTaskMentionEmail({
          to: user.email,
          mentionedName: user.name ?? user.email,
          actorName: params.actorName,
          taskTitle: params.taskTitle,
          taskUrl: `${baseUrl}${link}`,
          contextLabel: params.contextLabel,
          summary,
        });
      } catch (error) {
        console.error(`[mentions] email failed for ${user.email}:`, error);
      }
    }),
  );
}
