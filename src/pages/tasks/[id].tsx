import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";

import { AttachmentList } from "~/components/AttachmentList";
import EmptyState from "~/components/EmptyState";
import { FileUploadButton } from "~/components/FileUploadButton";
import Layout from "~/components/Layout";
import TaskForm, { type TaskFormValues } from "~/components/TaskForm";
import { PriorityBadge } from "~/components/Badges";
import { StatusSelect } from "~/components/StatusSelect";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import {
  formatDate,
  formatDateTime,
  isOverdue,
  relativeDeadline,
  wasEdited,
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
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

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
  const addComment = api.comment.create.useMutation({
    onSuccess: async () => {
      await utils.task.byId.invalidate({ id });
      setComment("");
    },
  });
  const delComment = api.comment.delete.useMutation({
    onSuccess: () => utils.task.byId.invalidate({ id }),
  });
  const updateComment = api.comment.update.useMutation({
    onSuccess: async () => {
      await utils.task.byId.invalidate({ id });
      setEditingCommentId(null);
      setEditingCommentBody("");
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
    onSuccess: () => utils.task.byId.invalidate({ id }),
  });
  const addCommentAttachment = api.attachment.createForComment.useMutation({
    onSuccess: () => utils.task.byId.invalidate({ id }),
  });
  const delAttachment = api.attachment.delete.useMutation({
    onSuccess: () => utils.task.byId.invalidate({ id }),
  });

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

  function handleAddComment(e: FormEvent) {
    e.preventDefault();
    addComment.mutate({ taskId: id, body: comment });
  }

  return (
    <Layout title={t.title}>
      <Link
        href={`/projects/${t.projectId}`}
        className="text-sm text-indigo-600 hover:underline"
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
                <h1 className="text-2xl font-semibold">{t.title}</h1>
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
                <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {t.description}
                </p>
              ) : (
                <p className="mt-5 text-sm italic text-slate-400">
                  No description yet.
                </p>
              )}

              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Attachments
                </p>
                <AttachmentList
                  items={t.attachments}
                  onDelete={(attId) => delAttachment.mutate({ id: attId })}
                  deletingId={
                    delAttachment.isPending
                      ? delAttachment.variables?.id
                      : null
                  }
                />
                <FileUploadButton
                  disabled={addTaskAttachment.isPending}
                  onUploaded={async (file) => {
                    await addTaskAttachment.mutateAsync({
                      taskId: id,
                      ...file,
                    });
                  }}
                />
              </div>
            </div>

            {/* Comments */}
            <div className="card mt-6">
              <h2 className="mb-4 text-base font-semibold">
                Comments ({t.comments.length})
              </h2>
              <ul className="space-y-4">
                {t.comments.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {(c.author.name ?? c.author.email)
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    <div className="flex-1 rounded-md bg-slate-50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {c.author.name ?? c.author.email}
                        </p>
                        <div className="text-right text-xs text-slate-500">
                          <p>{formatDateTime(c.createdAt)}</p>
                          {wasEdited(c.createdAt, c.updatedAt) && (
                            <p className="text-slate-400">
                              Edited {formatDateTime(c.updatedAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      {editingCommentId === c.id ? (
                        <form
                          className="mt-2 space-y-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            updateComment.mutate({
                              id: c.id,
                              body: editingCommentBody,
                            });
                          }}
                        >
                          <textarea
                            className="input"
                            rows={3}
                            value={editingCommentBody}
                            onChange={(e) =>
                              setEditingCommentBody(e.target.value)
                            }
                            required
                            maxLength={2000}
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="btn-primary"
                              disabled={updateComment.isPending}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingCommentBody("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                          {c.body}
                        </p>
                      )}

                      <AttachmentList
                        items={c.attachments}
                        onDelete={(attId) =>
                          delAttachment.mutate({ id: attId })
                        }
                        deletingId={
                          delAttachment.isPending
                            ? delAttachment.variables?.id
                            : null
                        }
                      />

                      {editingCommentId !== c.id && (
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <FileUploadButton
                            label="Attach file"
                            disabled={addCommentAttachment.isPending}
                            onUploaded={async (file) => {
                              await addCommentAttachment.mutateAsync({
                                commentId: c.id,
                                ...file,
                              });
                            }}
                          />
                          <button
                            type="button"
                            className="text-xs text-indigo-600 hover:underline"
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditingCommentBody(c.body);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => delComment.mutate({ id: c.id })}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {t.comments.length === 0 && (
                  <li className="text-sm italic text-slate-400">
                    No comments yet — start the discussion.
                  </li>
                )}
              </ul>

              <form onSubmit={handleAddComment} className="mt-6 space-y-2">
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Add a comment…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  maxLength={2000}
                />
                <p className="text-xs text-slate-500">
                  You can attach images or PDFs to comments after posting.
                </p>
                <div className="flex justify-end">
                  <button
                    className="btn-primary"
                    disabled={addComment.isPending}
                  >
                    {addComment.isPending ? "Posting…" : "Post comment"}
                  </button>
                </div>
              </form>
            </div>
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
                <span
                  className={
                    isOverdue(t.deadline) ? "font-medium text-red-600" : ""
                  }
                >
                  {formatDate(t.deadline)} · {relativeDeadline(t.deadline)}
                </span>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Assignees">
              {t.assignees.length === 0 ? (
                <span className="text-slate-400">Unassigned</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {t.assignees.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                    >
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-indigo-100 text-[9px] font-semibold text-indigo-700">
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
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-slate-800">{children}</div>
    </div>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}
