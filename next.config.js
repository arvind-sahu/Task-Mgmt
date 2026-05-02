/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  /**
   * `standalone` produces a self-contained `.next/standalone` folder used by
   * the Dockerfile. It is intentionally opt-in via `BUILD_STANDALONE=1` —
   * with `output: "standalone"` always on, plain `next start` breaks because
   * it can't find vendor chunks (Next puts them under `.next/standalone/`).
   *
   * Use it via:  `BUILD_STANDALONE=1 npm run build`
   * The Dockerfile sets this in the builder stage.
   *
   * @see https://nextjs.org/docs/pages/api-reference/next-config-js/output
   */
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),

  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  transpilePackages: ["geist"],
};

export default config;
