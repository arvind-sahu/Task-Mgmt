import { randomUUID } from "crypto";
import { type LeadRequestStatus, type LeadRequestType } from "@prisma/client";
import nodemailer from "nodemailer";

import { env } from "~/env";
import { db } from "~/server/db";

const DEFAULT_LEAD_INBOX_EMAIL = "arvindkumar93258@gmail.com";

function randomTenDigitNumberString() {
  return Math.floor(1_000_000_000 + Math.random() * 9_000_000_000).toString();
}

async function generateUniqueRequestId() {
  for (let attempts = 0; attempts < 30; attempts++) {
    const requestId = randomTenDigitNumberString();
    const existing = await db.$queryRaw<Array<{ requestId: string }>>`
      SELECT "requestId"
      FROM "LeadRequest"
      WHERE "requestId" = ${requestId}
      LIMIT 1
    `;
    if (existing.length === 0) return requestId;
  }
  throw new Error("Unable to allocate a unique request id");
}

function renderLeadEmailHtml(params: {
  requestId: string;
  type: LeadRequestType;
  fullName?: string | null;
  workEmail: string;
  companyRole?: string | null;
  companySize?: string | null;
  message?: string | null;
  source?: string | null;
  status: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">New Tasker lead request</h2>
      <p style="margin: 0 0 16px;">
        <strong>Request ID:</strong> ${params.requestId}<br/>
        <strong>Type:</strong> ${params.type}<br/>
        <strong>Status:</strong> ${params.status}
      </p>
      <p style="margin: 0 0 16px;">
        <strong>Name:</strong> ${params.fullName || "N/A"}<br/>
        <strong>Email:</strong> ${params.workEmail}<br/>
        <strong>Company / Role:</strong> ${params.companyRole || "N/A"}<br/>
        <strong>Company size:</strong> ${params.companySize || "N/A"}<br/>
        <strong>Source:</strong> ${params.source || "marketing-site"}
      </p>
      <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc;">
        <strong>Requirements</strong>
        <p style="margin: 8px 0 0; white-space: pre-wrap;">${params.message || "No details shared."}</p>
      </div>
    </div>
  `;
}

async function processLeadRequestEmail(leadRequestId: string) {
  const leadRows = await db.$queryRaw<
    Array<{
      id: string;
      requestId: string;
      type: LeadRequestType;
      status: string;
      fullName: string | null;
      workEmail: string;
      companyRole: string | null;
      companySize: string | null;
      message: string | null;
      source: string | null;
    }>
  >`
    SELECT
      "id",
      "requestId",
      "type",
      "status",
      "fullName",
      "workEmail",
      "companyRole",
      "companySize",
      "message",
      "source"
    FROM "LeadRequest"
    WHERE "id" = ${leadRequestId}
    LIMIT 1
  `;
  const lead = leadRows[0];
  if (!lead) return;

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    await db.$executeRaw`
      UPDATE "LeadRequest"
      SET "emailStatus" = 'SKIPPED', "emailError" = 'SMTP is not configured; email not sent.'
      WHERE "id" = ${lead.id}
    `;
    console.log(`[lead] SMTP missing, skipped email for request ${lead.requestId}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM ?? env.SMTP_USER,
      to: env.LEAD_INBOX_EMAIL ?? DEFAULT_LEAD_INBOX_EMAIL,
      subject: `[Tasker] Lead request #${lead.requestId} (${lead.type})`,
      replyTo: lead.workEmail,
      html: renderLeadEmailHtml({
        requestId: lead.requestId,
        type: lead.type,
        fullName: lead.fullName,
        workEmail: lead.workEmail,
        companyRole: lead.companyRole,
        companySize: lead.companySize,
        message: lead.message,
        source: lead.source,
        status: lead.status,
      }),
    });

    await db.$executeRaw`
      UPDATE "LeadRequest"
      SET "emailStatus" = 'SENT', "emailSentAt" = ${new Date()}, "emailError" = NULL
      WHERE "id" = ${lead.id}
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    console.error(`[lead] Failed to send lead email for request ${lead.requestId}:`, error);
    await db.$executeRaw`
      UPDATE "LeadRequest"
      SET "emailStatus" = 'FAILED', "emailError" = ${message.slice(0, 500)}
      WHERE "id" = ${lead.id}
    `;
  }
}

export async function createLeadRequest(params: {
  type: LeadRequestType;
  fullName?: string;
  workEmail: string;
  companyRole?: string;
  companySize?: string;
  message?: string;
  source?: string;
}) {
  const requestId = await generateUniqueRequestId();
  const recordId = randomUUID();
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      requestId: string;
      status: string;
      emailStatus: string;
      createdAt: Date;
    }>
  >`
    INSERT INTO "LeadRequest" (
      "id",
      "requestId",
      "type",
      "status",
      "emailStatus",
      "fullName",
      "workEmail",
      "companyRole",
      "companySize",
      "message",
      "source",
      "updatedAt"
    )
    VALUES (
      ${recordId},
      ${requestId},
      CAST(${params.type} AS "LeadRequestType"),
      CAST('NEW' AS "LeadRequestStatus"),
      CAST('QUEUED' AS "LeadRequestEmailStatus"),
      ${params.fullName?.trim() || null},
      ${params.workEmail.toLowerCase().trim()},
      ${params.companyRole?.trim() || null},
      ${params.companySize?.trim() || null},
      ${params.message?.trim() || null},
      ${params.source?.trim() || "marketing-site"},
      NOW()
    )
    RETURNING "id", "requestId", "status", "emailStatus", "createdAt"
  `;
  const lead = rows[0];
  if (!lead) {
    throw new Error("Failed to create lead request");
  }

  // Non-blocking email dispatch; request is persisted immediately.
  setTimeout(() => {
    void processLeadRequestEmail(lead.id);
  }, 0);

  return lead;
}

export async function updateLeadRequestStatus(params: {
  requestId: string;
  status: LeadRequestStatus;
}) {
  const rows = await db.$queryRaw<
    Array<{ requestId: string; status: string; emailStatus: string; updatedAt: Date }>
  >`
    UPDATE "LeadRequest"
    SET "status" = CAST(${params.status} AS "LeadRequestStatus"), "updatedAt" = NOW()
    WHERE "requestId" = ${params.requestId}
    RETURNING "requestId", "status", "emailStatus", "updatedAt"
  `;
  const updated = rows[0];
  if (!updated) {
    throw new Error(`Lead request ${params.requestId} not found`);
  }
  return updated;
}
