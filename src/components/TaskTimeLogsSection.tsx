import { useSession } from "next-auth/react";
import { useState } from "react";

import { api } from "~/utils/api";
import { formatLogDate, hoursFromDecimal } from "~/utils/timeLog";

type TaskTimeLogsSectionProps = {
  taskId: string;
  canLogTime: boolean;
};

export function TaskTimeLogsSection({
  taskId,
  canLogTime,
}: TaskTimeLogsSectionProps) {
  const { data: session } = useSession();
  const viewerId = session?.user?.id;
  const utils = api.useUtils();
  const [hours, setHours] = useState("");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = api.timeLog.listByTask.useQuery({ taskId });
  const create = api.timeLog.create.useMutation({
    onSuccess: async () => {
      await utils.timeLog.listByTask.invalidate({ taskId });
      await utils.timeLog.myLogs.invalidate();
      setHours("");
      setDescription("");
      setLogDate(new Date().toISOString().slice(0, 10));
      setShowForm(false);
    },
  });
  const deleteLog = api.timeLog.delete.useMutation({
    onSuccess: () => void utils.timeLog.listByTask.invalidate({ taskId }),
  });

  const logs = data?.logs ?? [];

  return (
    <div className="card mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-heading">Time logged</h3>
          <p className="text-xs text-muted">
            Total: {(data?.totalHours ?? 0).toFixed(2)}h
          </p>
        </div>
        {canLogTime && (
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancel" : "Log time"}
          </button>
        )}
      </div>

      {showForm && canLogTime && (
        <form
          className="mb-4 grid gap-3 rounded-xl border p-3 sm:grid-cols-2"
          style={{ borderColor: "var(--border-muted)" }}
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = Number(hours);
            if (!parsed || parsed <= 0) return;
            create.mutate({
              taskId,
              hours: parsed,
              logDate: new Date(logDate),
              description: description || undefined,
            });
          }}
        >
          <div>
            <label className="label">Hours</label>
            <input
              type="number"
              step="0.25"
              min="0.01"
              max="999.99"
              className="input mt-1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input mt-1"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description (optional)</label>
            <input
              className="input mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="What did you work on?"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="submit"
              className="btn-primary text-xs"
              disabled={create.isPending}
            >
              {create.isPending ? "Saving…" : "Save entry"}
            </button>
          </div>
          {create.error && (
            <p className="text-xs text-red-600 sm:col-span-2">{create.error.message}</p>
          )}
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Loading time logs…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted">No time logged yet.</p>
      ) : (
        <ul className="divide-y text-sm" style={{ borderColor: "var(--border-muted)" }}>
          {logs.map((log) => {
            const h = hoursFromDecimal(log.hours);
            const canDelete =
              data?.canManage || (viewerId && log.userId === viewerId);
            return (
              <li key={log.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="font-medium text-heading">
                    {formatLogDate(log.logDate)} · {h.toFixed(2)}h
                  </p>
                  <p className="text-xs text-muted">
                    {log.user.name ?? log.user.email}
                  </p>
                  {log.description && (
                    <p className="mt-1 text-xs text-muted">{log.description}</p>
                  )}
                </div>
                {canDelete && (
                  <button
                    type="button"
                    className="btn-ghost text-xs text-red-600"
                    disabled={deleteLog.isPending}
                    onClick={() => {
                      if (confirm("Delete this time entry?")) {
                        deleteLog.mutate({ id: log.id });
                      }
                    }}
                  >
                    Delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
