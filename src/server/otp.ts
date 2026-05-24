import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

import { env } from "~/env";
import {
  EmailDeliveryError,
  friendlyEmailSendErrorMessage,
} from "~/server/emailErrors";
import { db } from "~/server/db";

type OtpPurpose = "LOGIN_2FA" | "FORGOT_PASSWORD" | "SIGNUP_VERIFY";

const OTP_EXPIRY_MINUTES = 10;

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function shouldUseFixedOtp() {
  return env.APP_ENV === "dev" || env.APP_ENV === "stg";
}

async function sendEmailOtp(email: string, code: string, purpose: OtpPurpose) {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    // Dev fallback when SMTP is not configured.
    console.log(`[OTP:${purpose}] ${email} -> ${code}`);
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
      to: email,
      subject:
        purpose === "LOGIN_2FA"
          ? "Your Tasker login verification code"
          : purpose === "FORGOT_PASSWORD"
            ? "Your Tasker password reset code"
            : "Your Tasker sign up verification code",
      html: `
      <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111827;">
        <h2 style="margin-bottom: 8px;">Tasker verification code</h2>
        <p style="margin: 0 0 12px;">Use this OTP to continue:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; margin: 0 0 12px;">${code}</p>
        <p style="margin: 0 0 12px;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p style="margin: 0; color: #6b7280;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
    });
  } catch (err) {
    console.error(`[email] Failed to send OTP (${purpose}) to ${email}:`, err);
    throw new EmailDeliveryError(friendlyEmailSendErrorMessage(err));
  }
}

export async function issueEmailOtp(email: string, purpose: OtpPurpose) {
  const normalizedEmail = email.toLowerCase();
  const code = shouldUseFixedOtp() ? "555555" : generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const record = await db.emailOtp.create({
    data: {
      email: normalizedEmail,
      purpose,
      codeHash,
      expiresAt,
    },
  });

  try {
    await sendEmailOtp(normalizedEmail, code, purpose);
  } catch (err) {
    await db.emailOtp.delete({ where: { id: record.id } }).catch(() => undefined);
    throw err;
  }
  return { expiresAt };
}

export async function verifyEmailOtp(params: {
  email: string;
  code: string;
  purpose: OtpPurpose;
  consume?: boolean;
}) {
  const normalizedEmail = params.email.toLowerCase();
  const otpRecord = await db.emailOtp.findFirst({
    where: {
      email: normalizedEmail,
      purpose: params.purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) return false;

  const matches = await bcrypt.compare(params.code, otpRecord.codeHash);
  if (!matches) return false;

  if (params.consume ?? true) {
    await db.emailOtp.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    });
  }
  return true;
}
