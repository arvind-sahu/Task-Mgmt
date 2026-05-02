import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest config: maps the `~/` alias used by the T3 template and pulls env
// vars from .env.test (created via `env.test.example`). The default `node`
// environment matches our server-side, framework-agnostic unit tests.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    },
  },
});
