import { api } from "~/utils/api";
import { formatDateTime } from "~/utils/date";

export function SecurityPanel() {
  const utils = api.useUtils();
  const security = api.user.security.useQuery();
  const disconnect = api.user.disconnectAccount.useMutation({
    onSuccess: () => void utils.user.security.invalidate(),
  });

  if (security.isLoading) {
    return <p className="text-sm text-slate-500">Loading security info…</p>;
  }
  if (!security.data) return null;

  const { accounts, loginAudits, hasPassword, sessionNote } = security.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Active session</h2>
        <p className="mt-1 text-sm text-slate-500">{sessionNote}</p>
        <p className="mt-2 text-sm text-slate-700">
          Password login: {hasPassword ? "Enabled" : "Not set"}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800">Connected accounts</h3>
        {accounts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No OAuth accounts linked.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="capitalize">{a.provider}</span>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
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
          <p className="mt-2 text-xs text-red-600">{disconnect.error.message}</p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800">Recent sign-ins</h3>
        {loginAudits.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Sign in again to record login history.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
            {loginAudits.map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="capitalize">{log.method}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {formatDateTime(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
