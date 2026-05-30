import { type NextApiRequest, type NextApiResponse } from "next";
import { z } from "zod";

import { withApiRateLimit } from "~/server/api/withApiRateLimit";
import { createLeadRequest } from "~/server/leadRequest";
import {
  sanitizeOptionalPlainText,
  sanitizePlainText,
} from "~/server/security/sanitize";

const leadRequestInputSchema = z.object({
  type: z.enum(["DEMO_REQUEST", "CONTACT_SALES", "NEWSLETTER_SIGNUP"]),
  fullName: z.string().min(2).max(120).optional(),
  workEmail: z.string().email(),
  companyRole: z.string().max(140).optional(),
  companySize: z.string().max(80).optional(),
  message: z.string().max(4000).optional(),
  source: z.string().max(100).optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = leadRequestInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request payload" });
  }

  const { type, workEmail, fullName, companyRole, companySize, message, source } =
    parsed.data;
  if (!type || !workEmail) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const lead = await createLeadRequest({
      type,
      workEmail: sanitizePlainText(workEmail),
      fullName: sanitizeOptionalPlainText(fullName),
      companyRole: sanitizeOptionalPlainText(companyRole),
      companySize: sanitizeOptionalPlainText(companySize),
      message: sanitizeOptionalPlainText(message),
      source: sanitizeOptionalPlainText(source),
    });
    return res.status(201).json({
      requestId: lead.requestId,
      status: lead.status,
      emailStatus: lead.emailStatus,
      createdAt: lead.createdAt,
    });
  } catch (error) {
    console.error("[lead-request] Failed to create lead request:", error);
    return res.status(500).json({ error: "Failed to create lead request" });
  }
}

export default withApiRateLimit(handler, "lead-request");
