import { createHash } from "crypto";

import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";

import { INVALID_CREDENTIALS_MESSAGE } from "~/server/auth";
import { parseLoginDevice } from "~/server/security/loginAudit";

export const LOGIN_PASSWORD_MAX_ATTEMPTS = 5;
export const LOGIN_OTP_MAX_ATTEMPTS = 3;
export const LOGIN_LOCKOUT_MS = 30 * 60 * 1000;
export const LOGIN_FAILURE_WINDOW_MS = 30 * 60 * 1000;
/** Window after OTP verify during which NextAuth can complete sign-in without re-entering OTP. */
export const LOGIN_OTP_GRACE_MS = 2 * 60 * 1000;

export type LoginSecurityScope = {
  email: string;
  ip: string;
  userAgent?: string;
};

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function deviceFingerprint(userAgent?: string) {
  const ua = (userAgent ?? "unknown").slice(0, 512);
  return createHash("sha256").update(ua).digest("hex").slice(0, 16);
}

function scopeSuffix(scope: LoginSecurityScope) {
  return `${normalizeEmail(scope.email)}:${scope.ip}:${deviceFingerprint(scope.userAgent)}`;
}

function lockKey(kind: "pwd" | "otp", scope: LoginSecurityScope) {
  return `login:lock:${kind}:${scopeSuffix(scope)}`;
}

function failKey(kind: "pwd" | "otp", scope: LoginSecurityScope) {
  return `login:fail:${kind}:${scopeSuffix(scope)}`;
}

function lockoutMessage(kind: "pwd" | "otp", retryAfterMs: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  if (kind === "otp") {
    return `Too many incorrect verification codes. Sign in again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }
  return `Too many failed login attempts for this account on this device. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

async function pruneStaleHits(db: PrismaClient, key: string) {
  const cutoff = new Date(Date.now() - LOGIN_FAILURE_WINDOW_MS * 2);
  await db.rateLimitHit.deleteMany({
    where: { key, createdAt: { lt: cutoff } },
  });
}

async function activeLock(
  db: PrismaClient,
  kind: "pwd" | "otp",
  scope: LoginSecurityScope,
) {
  const since = new Date(Date.now() - LOGIN_LOCKOUT_MS);
  return db.rateLimitHit.findFirst({
    where: { key: lockKey(kind, scope), createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
}

export async function assertLoginNotLocked(
  db: PrismaClient,
  kind: "pwd" | "otp",
  scope: LoginSecurityScope,
): Promise<void> {
  const lock = await activeLock(db, kind, scope);
  if (!lock) return;

  const retryAfterMs = lock.createdAt.getTime() + LOGIN_LOCKOUT_MS - Date.now();
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: lockoutMessage(kind, retryAfterMs),
  });
}

async function invalidateLoginOtps(db: PrismaClient, email: string) {
  await db.emailOtp.updateMany({
    where: {
      email: normalizeEmail(email),
      purpose: "LOGIN_2FA",
      consumedAt: null,
    },
    data: { consumedAt: new Date() },
  });
}

export async function recordFailedLoginAudit(input: {
  db: PrismaClient;
  userId: string;
  scope: LoginSecurityScope;
  kind: "password" | "otp";
}) {
  const device = parseLoginDevice(input.scope.userAgent);
  await input.db.loginAudit.create({
    data: {
      userId: input.userId,
      method:
        input.kind === "password"
          ? "credentials_password_failed"
          : "credentials_otp_failed",
      ipAddress:
        input.scope.ip === "unknown" ? null : input.scope.ip.slice(0, 64),
      userAgent: input.scope.userAgent?.slice(0, 512) ?? null,
      deviceType: device.deviceType,
      deviceOs: device.deviceOs,
      deviceLabel: device.deviceLabel,
    },
  });
}

async function applyFailureLockout(
  db: PrismaClient,
  kind: "pwd" | "otp",
  scope: LoginSecurityScope,
) {
  await db.rateLimitHit.create({ data: { key: lockKey(kind, scope) } });
  if (kind === "otp") {
    await invalidateLoginOtps(db, scope.email);
  }
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: lockoutMessage(kind, LOGIN_LOCKOUT_MS),
  });
}

export async function recordLoginPasswordFailure(
  db: PrismaClient,
  scope: LoginSecurityScope,
  userId: string,
): Promise<never> {
  const key = failKey("pwd", scope);
  await pruneStaleHits(db, key);
  await db.rateLimitHit.create({ data: { key } });
  await recordFailedLoginAudit({ db, userId, scope, kind: "password" });

  const since = new Date(Date.now() - LOGIN_FAILURE_WINDOW_MS);
  const count = await db.rateLimitHit.count({
    where: { key, createdAt: { gte: since } },
  });

  if (count >= LOGIN_PASSWORD_MAX_ATTEMPTS) {
    await applyFailureLockout(db, "pwd", scope);
  }

  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: INVALID_CREDENTIALS_MESSAGE,
  });
}

export async function recordLoginOtpFailure(
  db: PrismaClient,
  scope: LoginSecurityScope,
  userId: string,
): Promise<never> {
  const key = failKey("otp", scope);
  await pruneStaleHits(db, key);
  await db.rateLimitHit.create({ data: { key } });
  await recordFailedLoginAudit({ db, userId, scope, kind: "otp" });

  const since = new Date(Date.now() - LOGIN_FAILURE_WINDOW_MS);
  const count = await db.rateLimitHit.count({
    where: { key, createdAt: { gte: since } },
  });

  if (count >= LOGIN_OTP_MAX_ATTEMPTS) {
    await applyFailureLockout(db, "otp", scope);
  }

  const remaining = LOGIN_OTP_MAX_ATTEMPTS - count;
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: `Invalid or expired verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
  });
}

export async function clearLoginFailures(
  db: PrismaClient,
  scope: LoginSecurityScope,
  kind?: "pwd" | "otp",
) {
  const kinds = kind ? [kind] : (["pwd", "otp"] as const);
  const keys = kinds.flatMap((k) => [failKey(k, scope), lockKey(k, scope)]);
  await db.rateLimitHit.deleteMany({ where: { key: { in: keys } } });
}

export async function hasRecentLoginOtpVerification(
  db: PrismaClient,
  email: string,
) {
  const record = await db.emailOtp.findFirst({
    where: {
      email: normalizeEmail(email),
      purpose: "LOGIN_2FA",
      consumedAt: { gte: new Date(Date.now() - LOGIN_OTP_GRACE_MS) },
    },
    orderBy: { consumedAt: "desc" },
  });
  return !!record;
}