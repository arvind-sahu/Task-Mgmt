import Link from "next/link";
import type { GetServerSidePropsContext } from "next";
import { useState } from "react";

import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import {
  downloadCsv,
  formatLogDate,
  hoursFromDecimal,
} from "~/utils/timeLog";

export default function MyTimelinePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "", taskSearch: "" });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const logsQuery = api.timeLog.myLogs.useQuery({
    from: applied.from ? new Date(applied.from) : undefined,
    to: applied.to ? new Date(applied.to) : undefined,
    taskSearch: applied.taskSearch || undefined,
  });

  const exportCsv = api.timeLog.exportMyCsv.useQuery(
    {
      from: applied.from ? new Date(applied.from) : undefined,
      to: applied.to ? new Date(applied.to) : undefined,
    },
    { enabled: false },
  );

  const data = logsQuery.data;

  return (
    <Layout title="My time logs">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-heading sm:text-2xl">My time logs</h1>
          <p className="text-sm text-muted">
            Your logged hours across all projects
            {data ? ` · Total: ${data.totalHours.toFixed(2)}h` : ""}
          </p>
        </div>

        <form
          className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied({ from, to, taskSearch });
          }}
        >
          <div>
            <label className="label">From</label>
            <input type="date" className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Task</label>
            <input
              className="input mt-1"
              placeholder="Search…"
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary flex-1 text-sm">Apply</button>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={exportCsv.isFetching}
              onClick={async () => {
                const result = await exportCsv.refetch();
                if (result.data?.csv) {
                  downloadCsv("my-time-logs.csv", result.data.csv);
                }
              }}
            >
              Export CSV
            </button>
          </div>
        </form>

        {logsQuery.isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : !data || data.byTask.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted">
            No time logs yet. Open a task and use &quot;Log time&quot; to add entries.
          </div>
        ) : (
          <ul className="space-y-3">
            {data.byTask.map((group) => {
              const open = expanded[group.taskId] ?? true;
              return (
                <li key={group.taskId} className="card">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 p-4 text-left"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [group.taskId]: !open,
                      }))
                    }
                  >
                    <div>
                      <p className="font-semibold text-heading">{group.title}</p>
                      <p className="text-xs text-muted">{group.projectName}</p>
                    </div>
                    <span className="chip rounded-full px-3 py-1 text-xs font-semibold">
                      {group.hours.toFixed(2)}h {open ? "▾" : "▸"}
                    </span>
                  </button>
                  {open && (
                    <ul className="border-t px-4 pb-3" style={{ borderColor: "var(--border-muted)" }}>
                      {group.logs.map((log) => (
                        <li
                          key={log.id}
                          className="flex flex-wrap items-start justify-between gap-2 border-b py-2 text-sm last:border-0"
                          style={{ borderColor: "var(--border-muted)" }}
                        >
                          <div>
                            <Link
                              href={`/tasks/${log.task.id}`}
                              className="font-medium text-heading hover:underline"
                            >
                              {formatLogDate(log.logDate)} — {hoursFromDecimal(log.hours).toFixed(2)}h
                            </Link>
                            {log.description && (
                              <p className="mt-0.5 text-xs text-muted">{log.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}
