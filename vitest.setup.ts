// Test setup — runs before every Vitest file.
//
// We set the env vars that `~/env` validates so tests can import server-side
// modules without a real .env. Skip the validator entirely as a belt and
// braces: SKIP_ENV_VALIDATION lets us short-circuit `createEnv`.
// `NODE_ENV` is typed as readonly in @types/node — assign through a cast.
const env = process.env as Record<string, string | undefined>;
env.SKIP_ENV_VALIDATION = "1";
env.NODE_ENV = "test";
env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
env.NEXTAUTH_SECRET = "test-secret";
env.NEXTAUTH_URL = "http://localhost:3000";
