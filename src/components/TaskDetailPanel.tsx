import { TaskStatus } from "@prisma/client";
import { useEffect, useMemo, useRef, useState } from "react";

import { AssigneePicker } from "~/components/AssigneePicker";
import { TASK_PRIORITIES } from "~/components/Badges";
import { SprintChangeControl } from "~/components/SprintChangeControl";
import { TaskCommentsSection } from "~/components/TaskCommentsSection";
import { TaskTimeLogsSection } from "~/components/TaskTimeLogsSection";
import { type TaskFormValues } from "~/components/TaskForm";
import { isTaskCompleted, TaskCompletedTick } from "~/components/TaskIndicators";
import {
  RichTextContent,
  RichTextEditor,
} from "~/components/rich-text";
import { useRichTextImageUpload } from "~/components/rich-text/useRichTextImageUpload";
import { api, type RouterOutputs } from "~/utils/api";
import { projectMembersToMentionUsers } from "~/utils/mentions";
import { getAllowedNextStatuses } from "~/utils/workflow";

export type TaskDetailItem = RouterOutputs["task"]["byId"];

export type SprintOption = {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
};

type TaskDetailPanelProps = {
  task?: TaskDetailItem;
  loading: boolean;
  error?: string;
  sprintOptions: SprintOption[];
  submitting: boolean;
  updateError?: string;
  onBack: () => void;
  onSubmit: (values: TaskFormValues) => void;
  backLabel?: string;
  onDelete?: () => void;
  deletePending?: boolean;
};

export function TaskDetailPanel({
  task,
  loading,
  error,
  sprintOptions,
  submitting,
  updateError,
  onBack,
  onSubmit,
  backLabel = "Back to task board",
  onDelete,
  deletePending = false,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [priority, setPriority] = useState<TaskDetailItem["priority"]>("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [transitionComment, setTransitionComment] = useState("");
  const lastSavedKeyRef = useRef("");
  const suppressNextTextBlurRef = useRef(false);
  const project = api.project.byId.useQuery(
    { id: task?.projectId ?? "" },
    { enabled: !!task?.projectId },
  );
  const workflow = api.workflow.byProject.useQuery(
    { projectId: task?.projectId ?? "" },
    { enabled: !!task?.projectId },
  );
  const { uploadImage } = useRichTextImageUpload();

  const statusOptions = useMemo(() => {
    if (!workflow.data) return [];
    return getAllowedNextStatuses(workflow.data, statusId);
  }, [workflow.data, statusId]);

  useEffect(() => {
    if (!task) return;
    const nextDeadline = task.deadline
      ? new Date(task.deadline).toISOString().slice(0, 10)
      : "";
    const nextAssigneeIds = task.assignees.map((assignee) => assignee.id);
    const nextTagIds = task.tags.map((tag) => tag.id);
    const nextStatusId = task.statusId ?? task.projectStatus?.id ?? "";
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatusId(nextStatusId);
    setPriority(task.priority);
    setDeadline(nextDeadline);
    setSprintId(task.sprintId);
    setAssigneeIds(nextAssigneeIds);
    setTagIds(nextTagIds);
    setPendingStatusId(null);
    setTransitionComment("");
    lastSavedKeyRef.current = JSON.stringify({
      title: task.title,
      description: task.description ?? "",
      statusId: nextStatusId,
      priority: task.priority,
      deadline: nextDeadline,
      sprintId: task.sprintId,
      assigneeIds: nextAssigneeIds,
      tagIds: nextTagIds,
    });
  }, [task]);

  function buildSubmitPayload(
    overrides: Partial<TaskFormValues> = {},
  ): TaskFormValues {
    return {
      title: overrides.title ?? title.trim(),
      description: overrides.description ?? (description || undefined),
      statusId: overrides.statusId ?? statusId,
      priority: overrides.priority ?? priority,
      deadline: overrides.deadline ?? (deadline || undefined),
      sprintId: overrides.sprintId ?? sprintId,
      assigneeIds: overrides.assigneeIds ?? assigneeIds,
      tagIds: overrides.tagIds ?? tagIds,
      transitionComment: overrides.transitionComment,
    };
  }

  function commitSave(overrides: Partial<TaskFormValues> = {}) {
    if (!task) return;
    const payload = buildSubmitPayload(overrides);
    if (!payload.title) return;
    const key = JSON.stringify(payload);
    if (key === lastSavedKeyRef.current) return;
    lastSavedKeyRef.current = key;
    onSubmit(payload);
  }

  useEffect(() => {
    if (!task) return;
    const payload = buildSubmitPayload();
    const key = JSON.stringify(payload);
    const original = JSON.parse(lastSavedKeyRef.current || "{}") as {
      title?: string;
      description?: string;
    };
    const autosavePayload = {
      ...payload,
      title: original.title ?? payload.title,
      description: original.description ?? payload.description,
    };
    const autosaveKey = JSON.stringify(autosavePayload);
    if (!payload.title || autosaveKey === lastSavedKeyRef.current) return;

    const timer = window.setTimeout(() => {
      lastSavedKeyRef.current = autosaveKey;
      onSubmit(autosavePayload);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    task,
    title,
    description,
    statusId,
    priority,
    deadline,
    sprintId,
    assigneeIds,
    tagIds,
    onSubmit,
  ]);

  const mentionUsers = useMemo(() => {
    if (!project.data) return [];
    const members = project.data.members
      .filter((member) => member.user != null)
      .map((member) => ({
        user: {
          id: member.user!.id,
          name: member.user!.name,
          email: member.user!.email,
        },
      }));
    return projectMembersToMentionUsers(members, project.data.owner);
  }, [project.data]);

  function saveTextField(overrides: { title?: string; description?: string }) {
    if (!task) return;
    const nextTitle = (overrides.title ?? title).trim();
    if (!nextTitle) {
      setTitle(task.title);
      return;
    }
    commitSave({
      title: nextTitle,
      description: overrides.description ?? description,
    });
  }

  function handleStatusSelect(nextId: string) {
    if (!workflow.data || nextId === statusId) return;
    const rule = workflow.data.transitions.find(
      (t) => t.fromStatusId === statusId && t.toStatusId === nextId,
    );
    if (rule?.requiresComment) {
      setPendingStatusId(nextId);
      setTransitionComment("");
      return;
    }
    setStatusId(nextId);
  }

  function confirmStatusTransition() {
    if (!pendingStatusId) return;
    setStatusId(pendingStatusId);
    commitSave({
      statusId: pendingStatusId,
      transitionComment: transitionComment.trim(),
    });
    setPendingStatusId(null);
    setTransitionComment("");
  }

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-slate-500">Loading task...</p>
      </div>
    );
  }

  if (!task || error) {
    return (
      <div className="card">
        <button className="btn-ghost mb-4" type="button" onClick={onBack}>
          {backLabel}
        </button>
        <p className="text-sm text-red-600">{error ?? "Task not found."}</p>
      </div>
    );
  }

  const assigneeMembers = project.data?.members.map((member) => member.user) ?? [];
  const isProjectOwner =
    task.viewerProjectRole === "OWNER" ||
    project.data?.currentUserRole === "OWNER";
  const completed = isTaskCompleted(task.status, task.projectStatus);
  const canLogTime =
    task.viewerProjectRole !== "VIEWER" &&
    project.data?.currentUserRole !== "VIEWER";

  return (
    <>
      <div className="card">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex min-w-0 items-start gap-3 lg:max-w-sm lg:flex-1 xl:max-w-md">
            <button
              type="button"
              className="btn-ghost grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-semibold shadow-sm"
              onClick={onBack}
              aria-label={backLabel}
            >
              ←
            </button>
            {titleEditing ? (
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {completed && <TaskCompletedTick className="mt-1.5" />}
                <textarea
                  className="editable-field-editing min-w-0 flex-1 resize-none rounded-xl px-2 py-1 text-lg font-semibold leading-7 outline-none"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => {
                    if (suppressNextTextBlurRef.current) {
                      suppressNextTextBlurRef.current = false;
                      return;
                    }
                    setTitleEditing(false);
                    saveTextField({ title });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setTitleEditing(false);
                      saveTextField({ title });
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      suppressNextTextBlurRef.current = true;
                      setTitle(task.title);
                      setTitleEditing(false);
                    }
                  }}
                  maxLength={200}
                  rows={2}
                  autoFocus
                  aria-label="Task title"
                />
              </div>
            ) : (
              <button
                type="button"
                className="editable-field flex min-w-0 flex-1 items-start gap-2 rounded-xl px-2 py-1 text-left text-lg font-semibold leading-7 text-heading"
                onClick={() => setTitleEditing(true)}
                title={title}
              >
                {completed && <TaskCompletedTick className="mt-1.5 shrink-0" />}
                <span className="line-clamp-2 min-w-0">{title}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:shrink-0 lg:justify-end">
            <AssigneePicker
              variant="compact"
              members={assigneeMembers}
              selectedIds={assigneeIds}
              onChange={setAssigneeIds}
            />
            <SprintChangeControl
              className="shrink-0"
              value={sprintId}
              sprints={sprintOptions}
              onChange={setSprintId}
            />
            {onDelete && (
              <button
                type="button"
                className="btn-danger shrink-0 text-xs"
                disabled={deletePending}
                onClick={() => {
                  if (confirm("Delete this task? This cannot be undone.")) {
                    onDelete();
                  }
                }}
              >
                {deletePending ? "Deleting…" : "Delete task"}
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-4">
          <div>
            <label className="label">Description</label>
            {descriptionEditing ? (
              <div className="mt-1">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Add task description…"
                  uploadImage={uploadImage}
                  mentionUsers={mentionUsers}
                  onBlur={() => {
                    if (suppressNextTextBlurRef.current) {
                      suppressNextTextBlurRef.current = false;
                      return;
                    }
                    setDescriptionEditing(false);
                    saveTextField({ description });
                  }}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => {
                      suppressNextTextBlurRef.current = true;
                      setDescription(task.description ?? "");
                      setDescriptionEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={() => {
                      setDescriptionEditing(false);
                      saveTextField({ description });
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="surface-inset mt-1 min-h-[6rem] rounded-xl px-3 py-2">
                <RichTextContent
                  html={description}
                  emptyLabel="Add task description…"
                  onClick={() => setDescriptionEditing(true)}
                  className="min-h-[5rem]"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input mt-1"
                value={statusId}
                onChange={(event) => handleStatusSelect(event.target.value)}
              >
                {statusOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {pendingStatusId && (
                <div className="mt-2 space-y-2 rounded-xl border p-2 text-xs" style={{ borderColor: "var(--border-muted)" }}>
                  <p className="font-medium text-heading">
                    This transition requires a reason
                  </p>
                  <textarea
                    className="input text-xs"
                    rows={2}
                    value={transitionComment}
                    onChange={(e) => setTransitionComment(e.target.value)}
                    placeholder="Explain why you're moving this task…"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      disabled={!transitionComment.trim()}
                      onClick={confirmStatusTransition}
                    >
                      Confirm move
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      onClick={() => setPendingStatusId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                className="input mt-1"
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value as TaskDetailItem["priority"],
                  )
                }
              >
                {TASK_PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0) + item.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Deadline</label>
              <input
                type="date"
                className="input mt-1"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          {submitting ? "Saving changes..." : "Changes auto-save."}
        </p>
        {updateError && (
          <p className="mt-3 text-sm" style={{ color: "var(--danger-text)" }}>
            {updateError}
          </p>
        )}
      </div>
      <TaskTimeLogsSection taskId={task.id} canLogTime={canLogTime} />
      <TaskCommentsSection
        taskId={task.id}
        comments={task.comments}
        isProjectOwner={isProjectOwner}
        mentionUsers={mentionUsers}
      />
    </>
  );
}
