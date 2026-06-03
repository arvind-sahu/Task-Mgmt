import { api } from "~/utils/api";
import { formatDateTime } from "~/utils/date";

function loginAuditMethodLabel(method: string) {
  if (method === "credentials_password_failed") return "Failed password";
  if (method === "credentials_otp_failed") return "Failed OTP";
  if (method === "credentials") return "Email sign-in";
  return method.replace(/_/g, " ");
}

function deviceIcon(deviceType: string | null | undefined) {
  if (deviceType === "mobile") return "📱";
  if (deviceType === "tablet") return "📱";
  if (deviceType === "desktop") return "💻";
  return "🖥️";
}

export function SecurityPanel() {
  const utils = api.useUtils();
  const security = api.user.security.useQuery();
  const disconnect = api.user.disconnectAccount.useMutation({
    onSuccess: () => void utils.user.security.invalidate(),
  });

  if (security.isLoading) {
    return <p className="text-sm text-muted">Loading security info…</p>;
  }
  if (!security.data) return null;

  const { accounts, loginAudits, hasPassword, sessionNote } = security.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Active session</h2>
        <p className="mt-1 text-sm text-muted">{sessionNote}</p>
        <p className="mt-2 text-sm text-heading">
          Password login: {hasPassword ? "Enabled" : "Not set"}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-heading">Connected accounts</h3>
        {accounts.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No OAuth accounts linked.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="surface-row flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm"
              >
                <span className="capitalize">{a.provider}</span>
                <button
                  type="button"
                  className="text-xs hover:underline"
                  style={{ color: "var(--danger-text)" }}
                  disabled={disconnect.isPending}
                  onClick={() => {
                    if (
                      confirm(
                        `Disconnect ${a.provider}? You need another way to sign in.`,
                      )
                    ) {
                      disconnect.mutate({ provider: a.provider });
                    }
                  }}
                >
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        )}
        {disconnect.error && (
          <p className="mt-2 text-xs" style={{ color: "var(--danger-text)" }}>
            {disconnect.error.message}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-heading">Recent sign-ins</h3>
        {loginAudits.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Sign in again to record login history.
          </p>
        ) : (
          <ul className="list-divider mt-2 overflow-hidden rounded-md border" style={{ borderColor: "var(--border)" }}>
            {loginAudits.map((log) => (
              <li key={log.id} className="surface-inset px-3 py-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span aria-hidden="true">{deviceIcon(log.deviceType)}</span>
                      <span className="font-medium text-heading">
                        {log.deviceLabel ?? "Unknown device"}
                      </span>
                      <span
                        className={`chip rounded-full px-2 py-0.5 text-xs capitalize ${
                          log.method.includes("failed")
                            ? "text-[var(--danger-text)]"
                            : ""
                        }`}
                      >
                        {loginAuditMethodLabel(log.method)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {log.locationLabel ?? "Location unavailable"}
                      {log.ipAddress ? ` · IP ${log.ipAddress}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
