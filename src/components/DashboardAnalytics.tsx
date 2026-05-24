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
      <section className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 p-5 shadow-sm">
        <div className="h-24 animate-pulse rounded-lg bg-slate-200/60" />
      </section>
    );
  }
  if (!data) return null;

  const maxStatus = Math.max(...Object.values(data.byStatus), 1);
  const maxPriority = Math.max(...Object.values(data.byPriority), 1);
  const inProgress = data.byStatus.IN_PROGRESS ?? 0;

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 p-4 shadow-sm ring-1 ring-indigo-50 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
          <p className="mt-0.5 text-sm text-slate-600">
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
        <div className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">By status</h3>
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

        <div className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">By priority</h3>
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

      <div className="mt-4 rounded-lg border border-white/80 bg-white/90 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Project progress</h3>
        {data.projectProgress.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No projects yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.projectProgress.map((p) => (
              <li key={p.id} className="rounded-md bg-slate-50/80 px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-indigo-600">
                    {p.percent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${p.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
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
  const tones = {
    neutral: "bg-white text-slate-800 ring-slate-200",
    blue: "bg-blue-50 text-blue-800 ring-blue-200",
    red: "bg-red-50 text-red-800 ring-red-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  };

  return (
    <div
      className={`inline-flex items-baseline gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ring-inset ${tones[tone]}`}
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
          <span className="w-[5.5rem] shrink-0 truncate text-slate-600">
            {item.label}
          </span>
          <div className="min-w-0 flex-1">
            <div className="h-6 overflow-hidden rounded-md bg-slate-100">
              <div
                className={`h-full ${item.color} transition-all`}
                style={{
                  width: `${Math.round((item.count / max) * 100)}%`,
                  minWidth: item.count > 0 ? "6px" : 0,
                }}
              />
            </div>
          </div>
          <span className="w-5 shrink-0 text-right text-sm font-semibold text-slate-800 tabular-nums">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
