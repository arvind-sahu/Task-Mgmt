import nodemailer from "nodemailer";

import { env } from "~/env";
import {
  EmailDeliveryError,
  friendlyEmailSendErrorMessage,
} from "~/server/emailErrors";

export async function sendTaskMentionEmail(params: {
  to: string;
  mentionedName: string;
  actorName: string;
  taskTitle: string;
  taskUrl: string;
  contextLabel: "comment" | "description";
  summary: string;
}) {
  const context =
    params.contextLabel === "comment"
      ? "mentioned you in a comment"
      : "mentioned you in a task description";
  const subject = `${params.actorName} mentioned you on "${params.taskTitle}"`;
  const preview = params.summary
    ? params.summary
    : "Open the task to read the full message.";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111827;">
      <h2 style="margin-bottom: 8px;">You were mentioned on Tasker</h2>
      <p style="margin: 0 0 12px;">
        <strong>${params.actorName}</strong> ${context} on
        <strong>${params.taskTitle}</strong>.
      </p>
      <p style="margin: 0 0 16px; color:#374151; font-size:14px;">
        ${preview}
      </p>
      <p style="margin: 0 0 16px;">
        <a href="${params.taskUrl}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          View task
        </a>
      </p>
      <p style="margin: 0; color:#6b7280; font-size:14px;">
        Or copy this link: ${params.taskUrl}
      </p>
    </div>
  `;

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    console.log(`[task-mention] ${params.to} -> ${params.taskUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM ?? env.SMTP_USER,
      to: params.to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`[email] task mention failed for ${params.to}:`, err);
    throw new EmailDeliveryError(friendlyEmailSendErrorMessage(err));
  }
}
