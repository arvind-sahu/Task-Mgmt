import { statusLabel } from "~/components/Badges";
import { api } from "~/utils/api";

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-indigo-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500",
};

export function DashboardAnalytics() {
  const { data, isLoading } = api.dashboard.analytics.useQuery();

  if (isLoading) {
    return (
      <section className="analytics-section rounded-xl p-5">
        <div
          className="h-24 animate-pulse rounded-lg"
          style={{ backgroundColor: "var(--surface-muted)" }}
        />
      </section>
    );
  }
  if (!data) return null;

  const maxStatus = Math.max(...Object.values(data.byStatus), 1);
  const maxPriority = Math.max(...Object.values(data.byPriority), 1);
  const inProgress = data.byStatus.IN_PROGRESS ?? 0;

  return (
    <section className="analytics-section min-w-0 max-w-full overflow-hidden rounded-xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-heading">Overview</h2>
          <p className="mt-0.5 text-sm text-muted">
            Task health and progress across your projects
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <KpiPill label="Open" value={data.summary.open} />
          <KpiPill label="In progress" value={inProgress} tone="blue" />
          <KpiPill
            label="Overdue"
            value={data.summary.overdue}
            tone={data.summary.overdue > 0 ? "red" : "neutral"}
          />
          <KpiPill label="Done" value={data.summary.completed} tone="green" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="analytics-panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-heading">By status</h3>
          <BarChart
            className="mt-3"
            items={Object.entries(data.byStatus).map(([key, count]) => ({
              key,
              label: statusLabel[key as keyof typeof statusLabel] ?? key,
              count,
              color: STATUS_COLORS[key] ?? "bg-slate-400",
            }))}
            max={maxStatus}
          />
        </div>

        <div className="analytics-panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-heading">By priority</h3>
          <BarChart
            className="mt-3"
            items={Object.entries(data.byPriority).map(([key, count]) => ({
              key,
              label: PRIORITY_LABELS[key] ?? key,
              count,
              color: PRIORITY_COLORS[key] ?? "bg-slate-400",
            }))}
            max={maxPriority}
          />
        </div>
      </div>

      <div className="analytics-panel mt-4 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-heading">Project progress</h3>
        {data.projectProgress.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No projects yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.projectProgress.map((p) => (
              <li
                key={p.id}
                className="surface-inset rounded-md px-3 py-2"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-heading">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="link-accent shrink-0 text-xs font-medium">
                    {p.percent}%
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full"
                  style={{ backgroundColor: "var(--border-muted)" }}
                >
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${p.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {p.done} of {p.total} tasks completed
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function KpiPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "blue" | "red" | "green";
}) {
  const toneClass =
    tone === "blue"
      ? "chip-active"
      : tone === "red"
        ? "ring-[var(--danger-text)]/30"
        : tone === "green"
          ? "kpi-tone-green ring-emerald-500/35"
          : "chip";

  const toneStyle =
    tone === "red"
      ? {
          color: "var(--danger-text)",
          backgroundColor: "var(--danger-hover-bg)",
        }
      : undefined;

  return (
    <div
      className={`inline-flex items-baseline gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ring-inset ${toneClass}`}
      style={toneStyle}
    >
      <span className="text-xs font-medium uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span className="text-lg font-bold leading-none tabular-nums">{value}</span>
    </div>
  );
}

function BarChart({
  items,
  max,
  className = "",
}: {
  items: { key: string; label: string; count: number; color: string }[];
  max: number;
  className?: string;
}) {
  return (
    <ul className={`space-y-2.5 ${className}`}>
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2 text-sm">
          <span className="w-[5.5rem] shrink-0 truncate text-muted">
            {item.label}
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="h-6 overflow-hidden rounded-md"
              style={{ backgroundColor: "var(--surface-muted)" }}
            >
              <div
                className={`h-full ${item.color} transition-all`}
                style={{
                  width: `${Math.round((item.count / max) * 100)}%`,
                  minWidth: item.count > 0 ? "6px" : 0,
                }}
              />
            </div>
          </div>
          <span className="w-5 shrink-0 text-right text-sm font-semibold text-heading tabular-nums">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
