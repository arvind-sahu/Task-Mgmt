import nodemailer from "nodemailer";

import { env } from "~/env";
import {
  EmailDeliveryError,
  friendlyEmailSendErrorMessage,
} from "~/server/emailErrors";

export async function sendCompanyInviteEmail(params: {
  to: string;
  companyName: string;
  inviterName: string;
  roleLabel: string;
  acceptUrl: string;
  expiresAt: Date;
}) {
  const subject = `You've been invited to join ${params.companyName} on Tasker`;
  const expires = params.expiresAt.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111827;">
      <h2 style="margin-bottom: 8px;">Join ${params.companyName} on Tasker</h2>
      <p style="margin: 0 0 12px;">
        <strong>${params.inviterName}</strong> has invited you to join
        <strong>${params.companyName}</strong> as a <strong>${params.roleLabel}</strong>.
      </p>
      <p style="margin: 0 0 16px;">
        <a href="${params.acceptUrl}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          Accept invitation
        </a>
      </p>
      <p style="margin: 0 0 12px; color:#6b7280; font-size:14px;">
        Or copy this link: ${params.acceptUrl}
      </p>
      <p style="margin: 0; color:#6b7280; font-size:14px;">
        This link expires on ${expires} (7 days).
      </p>
    </div>
  `;

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    console.log(`[company-invite] ${params.to} -> ${params.acceptUrl}`);
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
    console.error(`[email] company invite failed for ${params.to}:`, err);
    throw new EmailDeliveryError(friendlyEmailSendErrorMessage(err));
  }
}

export function companyInviteAcceptUrl(token: string): string {
  const base = env.NEXTAUTH_URL.replace(/\/$/, "");
  return `${base}/auth/accept-company-invite?token=${encodeURIComponent(token)}`;
}

export function companyRoleLabel(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "MANAGER":
      return "Manager";
    case "MEMBER":
      return "Member";
    case "VIEWER":
      return "Viewer";
    default:
      return role;
  }
}
