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
    // CloudFront WAF ACLs must be created in us-east-1.
    const usEast1 = new aws.Provider("us-east-1", { region: "us-east-1" });

    const webAcl = new aws.wafv2.WebAcl(
      "WebAcl",
      {
        scope: "CLOUDFRONT",
        defaultAction: { allow: {} },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: "tasker-web-acl",
          sampledRequestsEnabled: true,
        },
        rules: [
          {
            name: "RateLimitRule",
            priority: 0,
            action: { block: {} },
            statement: {
              rateBasedStatement: {
                limit: 2000,
                aggregateKeyType: "IP",
              },
            },
            visibilityConfig: {
              cloudwatchMetricsEnabled: true,
              metricName: "tasker-rate-limit",
              sampledRequestsEnabled: true,
            },
          },
          {
            name: "AWSManagedRulesCommon",
            priority: 1,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                vendorName: "AWS",
                name: "AWSManagedRulesCommonRuleSet",
              },
            },
            visibilityConfig: {
              cloudwatchMetricsEnabled: true,
              metricName: "tasker-common-rules",
              sampledRequestsEnabled: true,
            },
          },
          {
            name: "AWSManagedRulesKnownBadInputs",
            priority: 2,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                vendorName: "AWS",
                name: "AWSManagedRulesKnownBadInputsRuleSet",
              },
            },
            visibilityConfig: {
              cloudwatchMetricsEnabled: true,
              metricName: "tasker-known-bad-inputs",
              sampledRequestsEnabled: true,
            },
          },
        ],
      },
      { provider: usEast1 },
    );

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
        MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID ?? "",
        MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID ?? "",
        LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ?? "",
        LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET ?? "",
        SMTP_HOST: process.env.SMTP_HOST ?? "",
        SMTP_PORT: process.env.SMTP_PORT ?? "",
        SMTP_USER: process.env.SMTP_USER ?? "",
        SMTP_PASS: process.env.SMTP_PASS ?? "",
        SMTP_FROM: process.env.SMTP_FROM ?? "",
        AWS_S3_ACCESS_KEY_ID: process.env.AWS_S3_ACCESS_KEY_ID ?? "",
        AWS_S3_SECRET_ACCESS_KEY: process.env.AWS_S3_SECRET_ACCESS_KEY ?? "",
        AWS_S3_REGION: process.env.AWS_S3_REGION ?? "ap-south-1",
        AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME ?? "",
      },
      transform: {
        cdn: {
          transform: {
            distribution(args) {
              args.webAclId = webAcl.arn;
            },
          },
        },
      },
      // Add a custom domain by uncommenting and pointing your DNS at the
      // generated CloudFront distribution:
      // domain: { name: "tasker.example.com", dns: sst.aws.dns() },
    });
  },
});
