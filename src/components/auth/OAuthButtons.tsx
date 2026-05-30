import { signIn } from "next-auth/react";

import type { OAuthProviderOption } from "~/server/oauth";

type OAuthProviderId = OAuthProviderOption["id"];

const PROVIDER_LABELS: Record<OAuthProviderId, string> = {
  google: "Google",
  microsoft: "Microsoft",
  github: "GitHub",
  linkedin: "LinkedIn",
};

const PROVIDER_ENV_HINTS: Record<OAuthProviderId, string> = {
  google:
    "Disabled by .env variable. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the dev server.",
  microsoft:
    "Disabled by .env variable. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET, then restart the dev server.",
  github:
    "Disabled by .env variable. Add AUTH_GITHUB_ID and AUTH_GITHUB_SECRET, then restart the dev server.",
  linkedin:
    "Disabled by .env variable. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET, then restart the dev server.",
};

type OAuthButtonsProps = {
  providers: OAuthProviderOption[];
  callbackUrl?: string;
  compact?: boolean;
};

/**
 * Social sign-in / sign-up buttons. OAuth creates an account on first use, so
 * the same control works on both `/auth/signin` and `/auth/signup`.
 */
export function OAuthButtons({
  providers,
  callbackUrl = "/dashboard",
  compact = false,
}: OAuthButtonsProps) {
  const configuredProviders = providers.filter((provider) => provider.configured);
  const disabledProviders = providers.filter((provider) => !provider.configured);
  const leftDisabledProviders = disabledProviders.slice(0, Math.ceil(disabledProviders.length / 2));
  const rightDisabledProviders = disabledProviders.slice(Math.ceil(disabledProviders.length / 2));
  const leadingProviders = configuredProviders.length > 0 ? leftDisabledProviders : [];
  const centerProviders = configuredProviders.length > 0 ? configuredProviders : providers.slice(0, 1);
  const fallbackProviders = configuredProviders.length > 0 ? rightDisabledProviders : providers.slice(1);
  const handleProviderClick = (provider: OAuthProviderOption) => {
    if (!provider.configured) return;
    void signIn(provider.id, { callbackUrl });
  };

  return (
    <div className={compact ? "mt-4" : "mt-6"}>
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Or continue with
        </p>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="px-3 py-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <OAuthProviderQueue
            providers={leadingProviders}
            align="right"
            onSelect={handleProviderClick}
          />
          <OAuthProviderQueue
            providers={centerProviders}
            align="center"
            onSelect={handleProviderClick}
            featured
          />
          <OAuthProviderQueue
            providers={fallbackProviders}
            align="left"
            onSelect={handleProviderClick}
          />
        </div>
      </div>
    </div>
  );
}

function OAuthProviderQueue({
  providers,
  align,
  featured = false,
  onSelect,
}: {
  providers: OAuthProviderOption[];
  align: "left" | "center" | "right";
  featured?: boolean;
  onSelect: (provider: OAuthProviderOption) => void;
}) {
  const justifyClass =
    align === "right" ? "justify-end" : align === "left" ? "justify-start" : "justify-center";

  return (
    <ul className={`flex min-w-0 items-center gap-1.5 ${justifyClass}`} role="list">
      {providers.map((provider) => {
        const { id, configured } = provider;
        return (
          <li key={id} className="relative">
            <button
              type="button"
              aria-label={`${PROVIDER_LABELS[id]} ${configured ? "sign-in option" : "disabled by .env variable"}`}
              title={configured ? PROVIDER_LABELS[id] : PROVIDER_ENV_HINTS[id]}
              onClick={() => onSelect(provider)}
              className={`group/provider relative grid place-items-center rounded-full border bg-white shadow-md shadow-slate-200/70 ring-1 transition duration-200 hover:z-20 hover:-translate-y-2 hover:scale-125 focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                featured ? "h-12 w-12" : "h-10 w-10"
              } ${
                configured
                  ? "border-white ring-slate-200 hover:ring-blue-200"
                  : "cursor-not-allowed border-slate-100 opacity-60 grayscale ring-slate-200"
              }`}
            >
              <OAuthIcon provider={id} />
              <span className="pointer-events-none absolute -bottom-7 left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover/provider:block group-focus-visible/provider:block">
                {configured ? PROVIDER_LABELS[id] : "Disabled by .env"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function OAuthIcon({ provider }: { provider: OAuthProviderId }) {
  if (provider === "google") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  }

  if (provider === "linkedin") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#0A66C2"
          d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.41v1.57h.05a3.74 3.74 0 0 1 3.36-1.85c3.6 0 4.26 2.37 4.26 5.45v6.3h.03ZM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.1 20.45H3.53V8.98H7.1v11.47ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0Z"
        />
      </svg>
    );
  }

  if (provider === "microsoft") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
        <path fill="#F25022" d="M1 1h10.4v10.4H1V1Z" />
        <path fill="#7FBA00" d="M12.6 1H23v10.4H12.6V1Z" />
        <path fill="#00A4EF" d="M1 12.6h10.4V23H1V12.6Z" />
        <path fill="#FFB900" d="M12.6 12.6H23V23H12.6V12.6Z" />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5 text-slate-900"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
