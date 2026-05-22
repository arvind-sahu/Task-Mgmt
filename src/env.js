import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Centralized, validated environment variables. Keeps the rest of the app
// type-safe and prevents the build from succeeding with missing config.
export const env = createEnv({
  server: {
    // Pooled connection used by the running app (Supabase pgbouncer URL).
    DATABASE_URL: z.string().url(),
    // Direct (non-pooled) connection used by `prisma migrate` only.
    DIRECT_URL: z.string().url().optional(),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Required in prod; optional in dev to ease local bootstrapping.
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),

    NEXTAUTH_URL: z.preprocess(
      (str) => process.env.VERCEL_URL ?? str,
      process.env.VERCEL ? z.string() : z.string().url(),
    ),
    APP_ENV: z.enum(["dev", "stg", "prod"]).default("dev"),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    SMTP_FROM: z.string().email().optional(),
  },

  client: {
    // No public envs yet — placeholder kept for future use.
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    APP_ENV: process.env.APP_ENV,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
