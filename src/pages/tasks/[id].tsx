import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import type { GetServerSidePropsContext } from "next";

import { AttachmentList, type AttachmentItem } from "~/components/AttachmentList";
import EmptyState from "~/components/EmptyState";
import { FileUploadButton } from "~/components/FileUploadButton";
import Layout from "~/components/Layout";
import { TaskCommentsSection } from "~/components/TaskCommentsSection";
import TaskForm, { type TaskFormValues } from "~/components/TaskForm";
import { PriorityBadge } from "~/components/Badges";
import { StatusSelect } from "~/components/StatusSelect";
import {
  isTaskCompleted,
  TaskCompletedTick,
  OverdueIcon,
  CalendarDueIcon,
} from "~/components/TaskIndicators";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import {
  formatDate,
  formatBoardDueDate,
  boardDeadlineLabel,
  isOverdue,
} from "~/utils/date";

/**
 * Task detail page. Shows the full task body, metadata, and a comment thread,
 * plus an inline edit mode for updates.
 */
export default function TaskDetail() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const utils = api.useUtils();
  const task = api.task.byId.useQuery({ id }, { enabled: !!id });

  const [editing, setEditing] = useState(false);

  const refreshTaskCaches = async () => {
    await utils.task.byId.invalidate({ id });
    await utils.task.list.invalidate();
    await utils.task.myTasks.invalidate();
    await utils.task.myUpcoming.invalidate();
  };

  const update = api.task.update.useMutation({
    onSuccess: async () => {
      await utils.task.byId.invalidate({ id });
      setEditing(false);
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
  const setStatus = api.task.setStatus.useMutation({
    onSuccess: async () => {
      await utils.task.byId.invalidate({ id });
      if (task.data) {
        await utils.task.list.invalidate({ projectId: task.data.projectId });
      }
    },
  });
  const addTaskAttachment = api.attachment.createForTask.useMutation({
    onSuccess: () => refreshTaskCaches(),
  });
  const requestAttachmentUploadUrl = api.attachment.getUploadUrl.useMutation();
  const delAttachment = api.attachment.delete.useMutation({
    onSuccess: () => refreshTaskCaches(),
  });
  const deletingAttachmentId =
    delAttachment.variables && typeof delAttachment.variables === "object"
      ? delAttachment.variables.id
      : null;

  if (task.isLoading) {
    return (
      <Layout title="Task">
        <p className="text-sm text-slate-500">Loading…</p>
      </Layout>
    );
  }
  if (task.error || !task.data) {
    const code = task.error?.data?.code;
    const isAuthError = code === "FORBIDDEN" || code === "NOT_FOUND";
    return (
      <Layout title="Task">
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
  const taskAttachments = normalizeAttachments(t.attachments);

  function handleEdit(values: TaskFormValues) {
    update.mutate({
      id,
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      deadline: values.deadline ? new Date(values.deadline) : null,
      assigneeIds: values.assigneeIds,
      tagIds: values.tagIds,
    });
  }

  return (
    <Layout title={t.title}>
      <Link
        href={`/projects/${t.projectId}`}
        className="link-accent text-sm hover:underline"
      >
        ← Back to {t.project.name}
      </Link>

      {editing ? (
        <div className="card mt-4">
          <h2 className="mb-4 text-lg font-semibold">Edit task</h2>
          <TaskForm
            projectId={t.projectId}
            initial={{
              title: t.title,
              description: t.description ?? "",
              status: t.status,
              priority: t.priority,
              deadline: t.deadline
                ? new Date(t.deadline).toISOString().slice(0, 10)
                : "",
              assigneeIds: t.assignees.map((a) => a.id),
              tagIds: t.tags.map((tg) => tg.id),
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
            submitting={update.isPending}
            submitLabel="Save changes"
          />
          {update.error && (
            <p className="mt-3 text-sm text-red-600">{update.error.message}</p>
          )}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-start justify-between gap-3">
                <h1 className="flex min-w-0 flex-1 items-start gap-2 text-2xl font-semibold text-heading">
                  {isTaskCompleted(t.status) && <TaskCompletedTick className="mt-1.5" />}
                  <span className="min-w-0">{t.title}</span>
                </h1>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      if (confirm("Delete this task? This cannot be undone."))
                        del.mutate({ id });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusSelect
                  status={t.status}
                  disabled={setStatus.isPending}
                  onChange={(status) => setStatus.mutate({ id, status })}
                />
                <PriorityBadge priority={t.priority} />
                {t.tags.map((tg) => (
                  <span
                    key={tg.id}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset"
                    style={{ color: tg.color, borderColor: tg.color }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tg.color }}
                    />
                    {tg.name}
                  </span>
                ))}
              </div>

              {t.description ? (
                <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-heading">
                  {t.description}
                </p>
              ) : (
                <p className="mt-5 text-sm italic text-muted">
                  No description yet.
                </p>
              )}

              <div
                className="mt-4 border-t pt-4"
                style={{ borderColor: "var(--border-muted)" }}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Attachments
                </p>
                <AttachmentList
                  items={taskAttachments}
                  onDelete={(attId) => delAttachment.mutate({ id: attId })}
                  deletingId={delAttachment.isPending ? deletingAttachmentId : null}
                />
                <FileUploadButton
                  disabled={addTaskAttachment.isPending}
                  requestUploadUrl={(input) =>
                    requestAttachmentUploadUrl.mutateAsync(input)
                  }
                  onUploaded={async (file) => {
                    await addTaskAttachment.mutateAsync({
                      taskId: id,
                      fileName: file.fileName,
                      mimeType: file.mimeType,
                      storageKey: file.storageKey,
                    });
                  }}
                />
              </div>
            </div>

            <TaskCommentsSection
              taskId={t.id}
              comments={t.comments}
              isProjectOwner={t.viewerProjectRole === "OWNER"}
            />
          </div>

          {/* Meta sidebar */}
          <aside className="card h-fit space-y-4 text-sm">
            <Field label="Project">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: t.project.color }}
                />
                {t.project.name}
              </div>
            </Field>
            <Field label="Created by">
              {t.creator.name ?? t.creator.email}
            </Field>
            <Field label="Deadline">
              {t.deadline ? (
                isTaskCompleted(t.status) ? (
                  <span>{formatDate(t.deadline)}</span>
                ) : isOverdue(t.deadline) ? (
                  <span
                    className="inline-flex items-center gap-1.5 font-semibold"
                    style={{ color: "var(--danger-text)" }}
                  >
                    <OverdueIcon className="h-4 w-4" />
                    Overdue
                    <span className="inline-flex items-center gap-1 font-medium">
                      <CalendarDueIcon className="h-4 w-4" />
                      {formatBoardDueDate(t.deadline)}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDueIcon className="h-4 w-4 text-muted" />
                    {boardDeadlineLabel(t.deadline) || formatBoardDueDate(t.deadline)}
                  </span>
                )
              ) : (
                "—"
              )}
            </Field>
            <Field label="Assignees">
              {t.assignees.length === 0 ? (
                <span className="text-muted">Unassigned</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {t.assignees.map((a) => (
                    <span
                      key={a.id}
                      className="chip inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                    >
                      <span className="app-avatar grid h-4 w-4 place-items-center rounded-full text-[9px] font-semibold">
                        {(a.name ?? a.email).charAt(0).toUpperCase()}
                      </span>
                      {a.name ?? a.email}
                    </span>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Created">{formatDate(t.createdAt)}</Field>
            <Field label="Updated">{formatDate(t.updatedAt)}</Field>
          </aside>
        </div>
      )}
    </Layout>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-1 text-heading">{children}</div>
    </div>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}

function normalizeAttachments(
  attachments: Array<{
    id?: string;
    fileName?: string;
    mimeType?: string;
    dataUrl?: string | null;
    storageKey?: string | null;
  }>,
): AttachmentItem[] {
  return attachments.filter(
    (
      att,
    ): att is AttachmentItem =>
      Boolean(att.id) &&
      Boolean(att.fileName) &&
      Boolean(att.mimeType) &&
      Boolean(att.storageKey ?? att.dataUrl),
  );
}
