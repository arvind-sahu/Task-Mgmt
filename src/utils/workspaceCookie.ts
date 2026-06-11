export const WORKSPACE_COOKIE = "tasker_company_id";

/** One year — workspace preference persists across sessions. */
export const WORKSPACE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export function setWorkspaceCookie(companyId: string) {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${WORKSPACE_COOKIE}=${encodeURIComponent(companyId)}; path=/; max-age=${WORKSPACE_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function clearWorkspaceCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${WORKSPACE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
