import Link from "next/link";
import { type TaskStatus } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";

import { DashboardAnalytics } from "~/components/DashboardAnalytics";
import Layout from "~/components/Layout";
import { PriorityBadge } from "~/components/Badges";
import { StatusSelect } from "~/components/StatusSelect";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import { isOverdue, relativeDeadline } from "~/utils/date";

/**
 * Dashboard — analytics and projects on the left, upcoming tasks on the right.
 */
export default function Dashboard() {
  const utils = api.useUtils();
  const upcoming = api.task.myUpcoming.useQuery();
  const projects = api.project.list.useQuery();

  const setStatus = api.task.setStatus.useMutation({
    onMutate: async (variables) => {
      if (!variables || typeof variables !== "object") return;
      const { id, status } = variables;
      if (!id || !status) return;
      await utils.task.myUpcoming.cancel();
      const prev = utils.task.myUpcoming.getData();
      utils.task.myUpcoming.setData(undefined, (old) =>
        old?.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.task.myUpcoming.setData(undefined, ctx.prev);
    },
    onSettled: () => void utils.task.myUpcoming.invalidate(),
  });
  const pendingStatusTaskId =
    setStatus.variables && typeof setStatus.variables === "object"
      ? setStatus.variables.id
      : undefined;

  return (
    <Layout title="Dashboard">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview, projects, and what needs your attention
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 md:gap-8 lg:grid-cols-12">
        {/* Main column: analytics + projects */}
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <DashboardAnalytics />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                Your projects
              </h2>
              <Link
                href="/projects"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="card grid gap-2 p-3 sm:grid-cols-2">
              {projects.isLoading && (
                <p className="p-2 text-sm text-slate-500 sm:col-span-2">
                  Loading…
                </p>
              )}
              {projects.data?.length === 0 && (
                <p className="p-2 text-sm text-slate-500 sm:col-span-2">
                  No projects yet.
                </p>
              )}
              {projects.data?.slice(0, 6).map((p) => (
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

        {/* Right sidebar: upcoming tasks */}
        <aside className="min-w-0 lg:col-span-4 lg:sticky lg:top-4">
          <h2 className="mb-3 text-base font-semibold text-slate-800">
            Upcoming tasks
          </h2>
          <div className="card max-h-[calc(100vh-8rem)] divide-y divide-slate-100 overflow-y-auto p-0">
            {upcoming.isLoading && (
              <p className="p-4 text-sm text-slate-500">Loading…</p>
            )}
            {upcoming.data?.length === 0 && (
              <p className="p-4 text-sm text-slate-500">
                You&apos;re all caught up. Create a task to get started.
              </p>
            )}
            {upcoming.data?.map((t) => (
              <div
                key={t.id}
                className="space-y-2 px-4 py-3 transition hover:bg-slate-50"
              >
                <Link href={`/tasks/${t.id}`} className="block min-w-0">
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.project.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-slate-900">
                        {t.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {t.project.name}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-2 pl-4">
                  <PriorityBadge priority={t.priority} />
                  <StatusSelect
                    status={t.status}
                    disabled={setStatus.isPending && pendingStatusTaskId === t.id}
                    onChange={(status: TaskStatus) =>
                      setStatus.mutate({ id: t.id, status })
                    }
                  />
                  <span
                    className={`ml-auto text-xs ${
                      isOverdue(t.deadline)
                        ? "font-medium text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    {relativeDeadline(t.deadline)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}
