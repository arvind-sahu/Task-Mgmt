import Link from "next/link";
import type { GetServerSidePropsContext } from "next";

import Layout from "~/components/Layout";
import { PriorityBadge, StatusBadge } from "~/components/Badges";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import { isOverdue, relativeDeadline } from "~/utils/date";

/**
 * Dashboard — the entry surface after sign-in. Shows:
 *  - Quick stats (open tasks, overdue, projects)
 *  - Upcoming tasks the user is involved with
 *  - Project list
 */
export default function Dashboard() {
  const upcoming = api.task.myUpcoming.useQuery();
  const projects = api.project.list.useQuery();

  const open = upcoming.data;
  const overdueCount = open?.filter((t: any) => isOverdue(t.deadline)).length;
  const inProgress = open?.filter(
    (t: any) => t.status === "IN_PROGRESS",
  ).length;

  return (
    <Layout title="Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">
          A quick overview of what needs your attention
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Open tasks" value={open?.length} />
        <Stat label="In progress" value={inProgress} accent="text-blue-600" />
        <Stat
          label="Overdue"
          value={overdueCount}
          accent={(overdueCount ?? 0) > 0 ? "text-red-600" : "text-slate-900"}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Upcoming tasks</h2>
          <div className="card divide-y divide-slate-100 p-0">
            {upcoming.isLoading && (
              <p className="p-5 text-sm text-slate-500">Loading…</p>
            )}
            {upcoming.data?.length === 0 && (
              <p className="p-5 text-sm text-slate-500">
                You&apos;re all caught up. Create a task to get started.
              </p>
            )}
            {upcoming.data?.map((t: any) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: t.project.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {t.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {t.project.name}
                  </p>
                </div>
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
                <span
                  className={`w-24 text-right text-xs ${
                    isOverdue(t.deadline)
                      ? "font-medium text-red-600"
                      : "text-slate-500"
                  }`}
                >
                  {relativeDeadline(t.deadline)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your projects</h2>
            <Link
              href="/projects"
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="card space-y-2 p-3">
            {projects.isLoading && (
              <p className="p-2 text-sm text-slate-500">Loading…</p>
            )}
            {projects.data?.length === 0 && (
              <p className="p-2 text-sm text-slate-500">No projects yet.</p>
            )}
            {projects.data?.slice(0, 6).map((p: any) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-3 rounded-md p-2 transition hover:bg-slate-50"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: p.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p._count.tasks} tasks · {p._count.members} members
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Stat({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: number | undefined;
  accent?: string;
}) {
  const loading = typeof value !== "number";
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-8 w-14 animate-pulse rounded-md bg-slate-200/80" />
      ) : (
        <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
      )}
    </div>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}
