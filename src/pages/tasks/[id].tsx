import Link from "next/link";
import { useRouter } from "next/router";
import type { GetServerSidePropsContext } from "next";

import EmptyState from "~/components/EmptyState";
import Layout from "~/components/Layout";
import { TaskDetailPanel } from "~/components/TaskDetailPanel";
import { type TaskFormValues } from "~/components/TaskForm";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";

const TASK_DETAIL_CONTENT_CLASS =
  "app-main mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[1600px] flex-1 flex-col overflow-hidden px-3 py-4 sm:px-5 sm:py-5 lg:px-6";

/**
 * Standalone task detail page — uses the same inline editor as the project board.
 */
export default function TaskDetail() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const utils = api.useUtils();
  const task = api.task.byId.useQuery({ id }, { enabled: !!id });
  const projectId = task.data?.projectId;
  const sprintBrief = api.sprint.listBrief.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId },
  );
  const sprintOptions = (sprintBrief.data ?? []).map((sprint) => ({
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  }));

  const update = api.task.update.useMutation({
    onSuccess: async () => {
      await utils.task.byId.invalidate({ id });
      await utils.task.list.invalidate();
      await utils.task.myTasks.invalidate();
      await utils.task.myUpcoming.invalidate();
    },
  });
  const del = api.task.delete.useMutation({
    onSuccess: async () => {
      if (task.data) {
        await utils.task.list.invalidate({ projectId: task.data.projectId });
        void router.push(`/projects/${task.data.projectId}`);
      }
    },
  });

  if (task.isLoading) {
    return (
      <Layout title="Task" contentClassName={TASK_DETAIL_CONTENT_CLASS}>
        <p className="text-sm text-slate-500">Loading…</p>
      </Layout>
    );
  }

  if (task.error || !task.data) {
    const code = task.error?.data?.code;
    const isAuthError = code === "FORBIDDEN" || code === "NOT_FOUND";
    return (
      <Layout title="Task" contentClassName={TASK_DETAIL_CONTENT_CLASS}>
        <EmptyState
          title={isAuthError ? "Task unavailable" : "Something went wrong"}
          message={
            isAuthError
              ? "This task doesn't exist or you don't have access to it."
              : (task.error?.message ?? "Failed to load this task.")
          }
          action={{ href: "/dashboard", label: "Back to dashboard" }}
        />
      </Layout>
    );
  }

  const t = task.data;

  function handleSubmit(values: TaskFormValues) {
    update.mutate({
      id,
      title: values.title,
      description: values.description,
      statusId: values.statusId,
      priority: values.priority,
      deadline: values.deadline ? new Date(values.deadline) : null,
      sprintId: values.sprintId,
      assigneeIds: values.assigneeIds,
      tagIds: values.tagIds,
      transitionComment: values.transitionComment,
    });
  }

  return (
    <Layout title={t.title} contentClassName={TASK_DETAIL_CONTENT_CLASS}>
      <Link
        href={`/projects/${t.projectId}`}
        className="link-accent shrink-0 text-sm hover:underline"
      >
        ← Back to {t.project.name}
      </Link>
      <div className="task-detail-shell mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <TaskDetailPanel
          task={t}
          loading={false}
          sprintOptions={sprintOptions}
          submitting={update.isPending}
          updateError={update.error?.message}
          backLabel={`Back to ${t.project.name}`}
          onBack={() => void router.push(`/projects/${t.projectId}`)}
          onSubmit={handleSubmit}
          onDelete={() => del.mutate({ id })}
          deletePending={del.isPending}
        />
      </div>
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}
