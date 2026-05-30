import { env } from "~/env";

export type OAuthProviderId = "google" | "microsoft" | "github" | "linkedin";

export const OAUTH_PROVIDER_IDS: OAuthProviderId[] = [
  "google",
  "microsoft",
  "github",
  "linkedin",
];

export type OAuthProviderOption = {
  id: OAuthProviderId;
  configured: boolean;
};

function isConfigured(id: OAuthProviderId): boolean {
  switch (id) {
    case "google":
      return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
    case "microsoft":
      return !!(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
    case "github":
      return !!(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
    case "linkedin":
      return !!(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET);
  }
}

/** Providers wired into NextAuth (must have credentials). */
export function getEnabledOAuthProviders(): OAuthProviderId[] {
  return OAUTH_PROVIDER_IDS.filter(isConfigured);
}

/** All social options for sign-in / sign-up UI. */
export function getOAuthProvidersForAuthPage(): OAuthProviderOption[] {
  return OAUTH_PROVIDER_IDS.map((id) => ({
    id,
    configured: isConfigured(id),
  }));
}
