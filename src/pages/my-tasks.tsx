import Link from "next/link";
import { useRouter } from "next/router";
import { type TaskStatus } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import { useMemo, useState } from "react";

import { PriorityBadge } from "~/components/Badges";
import Layout from "~/components/Layout";
import { StatusSelect } from "~/components/StatusSelect";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import { isOverdue, relativeDeadline } from "~/utils/date";

const FILTERS = [
  { key: "all", label: "All tasks" },
  { key: "overdue", label: "Overdue" },
  { key: "high", label: "High priority" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function MyTasksPage() {
  const router = useRouter();
  const searchQuery = typeof router.query.q === "string" ? router.query.q : "";
  const [filter, setFilter] = useState<FilterKey>("all");

  const utils = api.useUtils();
  const tasks = api.task.myTasks.useQuery(
    { search: searchQuery || undefined },
    { staleTime: 30_000 },
  );

  const setStatus = api.task.setStatus.useMutation({
    onMutate: async (variables) => {
      if (!variables || typeof variables !== "object") return;
      const { id, status } = variables;
      if (!id || !status) return;
      await utils.task.myTasks.cancel();
      const input = { search: searchQuery || undefined };
      const prev = utils.task.myTasks.getData(input);
      utils.task.myTasks.setData(input, (old) =>
        old?.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      return { prev, input };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev && ctx?.input) utils.task.myTasks.setData(ctx.input, ctx.prev);
    },
    onSettled: () => void utils.task.myTasks.invalidate(),
  });

  const filtered = useMemo(() => {
    const list = tasks.data ?? [];
    if (filter === "overdue") return list.filter((t) => isOverdue(t.deadline));
    if (filter === "high") return list.filter((t) => t.priority === "HIGH");
    return list;
  }, [tasks.data, filter]);

  const pendingStatusTaskId =
    setStatus.variables && typeof setStatus.variables === "object"
      ? setStatus.variables.id
      : undefined;

  return (
    <Layout title="My Tasks">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-heading sm:text-2xl">My Tasks</h1>
          <p className="text-sm text-muted">
            Everything assigned to you across projects
            {searchQuery ? (
              <>
                {" "}
                · search: <span className="font-medium text-heading">&quot;{searchQuery}&quot;</span>
              </>
            ) : null}
          </p>
        </div>
        <p className="text-sm text-muted">{filtered.length} tasks</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f.key ? "btn-primary py-1" : "chip"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {tasks.isLoading && <p className="p-4 text-sm text-muted">Loading…</p>}
        {filtered.length === 0 && !tasks.isLoading && (
          <p className="p-6 text-center text-sm text-muted">
            No tasks match this view. Check Projects or ask to be assigned work.
          </p>
        )}
        <ul className="list-divider max-h-[calc(100vh-12rem)] overflow-y-auto">
          {filtered.map((t) => (
            <li key={t.id} className="list-row-hover px-4 py-3 transition">
              <div className="flex flex-wrap items-start gap-3 gap-y-2">
                <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.project.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-heading">{t.title}</p>
                      <p className="text-xs text-muted">{t.project.name}</p>
                    </div>
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <PriorityBadge priority={t.priority} />
                  <StatusSelect
                    status={t.status}
                    disabled={setStatus.isPending && pendingStatusTaskId === t.id}
                    onChange={(status: TaskStatus) => setStatus.mutate({ id: t.id, status })}
                  />
                  <span
                    className={`text-xs ${
                      isOverdue(t.deadline) ? "font-medium text-red-500" : "text-muted"
                    }`}
                  >
                    {relativeDeadline(t.deadline)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}
