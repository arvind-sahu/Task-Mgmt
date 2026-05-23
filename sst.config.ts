/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST v3 (ion) configuration. Deploys this Next.js app as a Lambda-backed
 * serverless site on AWS, fronted by CloudFront.
 *
 * Run:
 *   npx sst dev   # local dev with live Lambda
 *   npx sst deploy --stage prod
 *
 * Required env vars (set in your shell or AWS SSM):
 *   - DATABASE_URL, DIRECT_URL  (Supabase)
 *   - NEXTAUTH_SECRET
 *   - NEXTAUTH_URL              (use the deployed CloudFront URL or custom domain)
 *   - AUTH_GITHUB_ID, AUTH_GITHUB_SECRET (optional OAuth)
 *   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (optional OAuth)
 *   - SMTP_* (optional, for email OTP)
 */
export default $config({
  app(input) {
    return {
      name: "tasker",
      removal: input?.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: { region: "ap-south-1" },
      },
    };
  },
  async run() {
    // The Next.js component handles bundling, image optimization, and
    // CloudFront distribution. Env vars are forwarded to the Lambda.
    new sst.aws.Nextjs("Web", {
      environment: {
        DATABASE_URL: process.env.DATABASE_URL!,
        DIRECT_URL: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
        AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ?? "",
        AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET ?? "",
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
        SMTP_HOST: process.env.SMTP_HOST ?? "",
        SMTP_PORT: process.env.SMTP_PORT ?? "",
        SMTP_USER: process.env.SMTP_USER ?? "",
        SMTP_PASS: process.env.SMTP_PASS ?? "",
        SMTP_FROM: process.env.SMTP_FROM ?? "",
      },
      // Add a custom domain by uncommenting and pointing your DNS at the
      // generated CloudFront distribution:
      // domain: { name: "tasker.example.com", dns: sst.aws.dns() },
    });
  },
});
