import { TaskPriority } from "@prisma/client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { AssigneePicker } from "~/components/AssigneePicker";
import { TASK_PRIORITIES } from "~/components/Badges";
import { SprintChangeControl } from "~/components/SprintChangeControl";
import { type TaskFormValues } from "~/components/TaskForm";
import { RichTextEditor } from "~/components/rich-text";
import { useRichTextImageUpload } from "~/components/rich-text/useRichTextImageUpload";
import { api } from "~/utils/api";
import { projectMembersToMentionUsers } from "~/utils/mentions";
import { getCreationStatuses } from "~/utils/workflow";

export type SprintOption = {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
};

type CreateTaskModalProps = {
  open: boolean;
  projectId: string;
  sprintOptions: SprintOption[];
  initial?: Partial<TaskFormValues>;
  submitting?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
};

export function CreateTaskModal({
  open,
  projectId,
  sprintOptions,
  initial,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: CreateTaskModalProps) {
  const project = api.project.byId.useQuery({ id: projectId }, { enabled: open });
  const workflow = api.workflow.byProject.useQuery(
    { projectId },
    { enabled: open },
  );
  const { uploadImage } = useRichTextImageUpload();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [deadline, setDeadline] = useState("");
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const wasOpenRef = useRef(false);

  const creationStatuses = useMemo(() => {
    if (!workflow.data) return [];
    return getCreationStatuses(workflow.data);
  }, [workflow.data]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setStatusId(
        initial?.statusId ??
          creationStatuses[0]?.id ??
          workflow.data?.creationAllowedStatusIds[0] ??
          "",
      );
      setPriority(initial?.priority ?? TaskPriority.MEDIUM);
      setDeadline(initial?.deadline ?? "");
      setSprintId(initial?.sprintId ?? null);
      setAssigneeIds(initial?.assigneeIds ?? []);
    }
    wasOpenRef.current = open;
  }, [open, initial, creationStatuses, workflow.data]);

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

  const assigneeMembers = project.data?.members.map((member) => member.user) ?? [];

  function handleSprintChange(nextSprintId: string | null) {
    setSprintId(nextSprintId);
    const sprint = sprintOptions.find((item) => item.id === nextSprintId);
    setDeadline(
      sprint ? new Date(sprint.endDate).toISOString().slice(0, 10) : "",
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !statusId) return;
    onSubmit({
      title: trimmedTitle,
      description: description || undefined,
      statusId,
      priority,
      deadline: deadline || undefined,
      sprintId,
      assigneeIds,
      tagIds: [],
    });
  }

  const creationNote =
    workflow.data && !workflow.data.settings.allowCreationInAnyNonTerminal
      ? `Tasks can only be created in: ${creationStatuses.map((s) => s.name).join(", ")}`
      : null;

  if (!open) return null;

  return (
    <div
      className="modal-overlay fixed inset-0 z-[90] grid place-items-center p-4"
      onClick={onClose}
    >
      <form
        className="modal-panel w-full max-w-3xl rounded-2xl p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="create-task-title"
            className="text-lg font-semibold text-heading"
          >
            Create task
          </h2>
          <button
            type="button"
            className="app-nav-link rounded-full px-2 py-1"
            onClick={onClose}
            aria-label="Close create task modal"
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0 flex-1">
            <label className="label">Title</label>
            <textarea
              className="editable-field-editing mt-1 min-w-0 w-full resize-none rounded-xl px-2 py-1 text-lg font-semibold leading-7 outline-none"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              rows={2}
              required
              autoFocus
              placeholder="Task title"
              aria-label="Task title"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:shrink-0 lg:justify-end">
            <AssigneePicker
              variant="compact"
              members={assigneeMembers}
              selectedIds={assigneeIds}
              onChange={setAssigneeIds}
            />
            {sprintOptions.length > 0 && (
              <SprintChangeControl
                className="shrink-0"
                value={sprintId}
                sprints={sprintOptions}
                onChange={handleSprintChange}
              />
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="label">Description</label>
            <div className="mt-1">
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Add task description…"
                uploadImage={uploadImage}
                mentionUsers={mentionUsers}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input mt-1"
                value={statusId}
                onChange={(event) => setStatusId(event.target.value)}
                required
              >
                {creationStatuses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {creationNote && (
                <p className="mt-1 text-[11px] text-muted">{creationNote}</p>
              )}
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                className="input mt-1"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
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

        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--danger-text)" }}>
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !title.trim() || !statusId}
          >
            {submitting ? "Creating…" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
