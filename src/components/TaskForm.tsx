import { TaskPriority, TaskStatus } from "@prisma/client";
import { useState, type FormEvent } from "react";

import { TASK_PRIORITIES, TASK_STATUSES, statusLabel } from "./Badges";
import { api } from "~/utils/api";
import { initialsFromName } from "~/utils/avatar";

export interface TaskFormValues {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string; // YYYY-MM-DD
  sprintId?: string | null;
  assigneeIds: string[];
  tagIds: string[];
}

type SprintOption = {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
};

interface Props {
  projectId: string;
  initial?: Partial<TaskFormValues>;
  sprintOptions?: SprintOption[];
  onSubmit: (values: TaskFormValues) => void;
  onCancel?: () => void;
  submitting?: boolean;
  submitLabel?: string;
  hideTitle?: boolean;
  hideSprint?: boolean;
  descriptionRows?: number;
}

/**
 * Reusable form for creating and editing tasks. Pulls members and tags from
 * the project so assignee and tag pickers are contextual.
 */
export default function TaskForm({
  projectId,
  initial,
  sprintOptions = [],
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Save",
  hideTitle = false,
  hideSprint = false,
  descriptionRows = 4,
}: Props) {
  const project = api.project.byId.useQuery({ id: projectId });
  const tags = api.tag.list.useQuery({ projectId });

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(
    initial?.status ?? TaskStatus.BACKLOG,
  );
  const [priority, setPriority] = useState<TaskPriority>(
    initial?.priority ?? TaskPriority.MEDIUM,
  );
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [sprintId, setSprintId] = useState<string | null | undefined>(
    initial?.sprintId,
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    initial?.assigneeIds ?? [],
  );
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      status,
      priority,
      deadline: deadline || undefined,
      sprintId,
      assigneeIds,
      tagIds,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!hideTitle && (
        <div>
          <label className="label">Title</label>
          <input
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            autoFocus
          />
        </div>
      )}

      {!hideSprint && sprintOptions.length > 0 && (
        <div>
          <label className="label">Sprint</label>
          <select
            className="input mt-1"
            value={sprintId ?? ""}
            onChange={(e) => {
              const nextSprintId = e.target.value || null;
              setSprintId(nextSprintId);
              const sprint = sprintOptions.find((item) => item.id === nextSprintId);
              setDeadline(
                sprint
                  ? new Date(sprint.endDate).toISOString().slice(0, 10)
                  : "",
              );
            }}
          >
            <option value="">Backlog</option>
            {sprintOptions.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Description</label>
        <textarea
          className="input mt-1"
          rows={descriptionRows}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Status</label>
          <select
            className="input mt-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select
            className="input mt-1"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
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
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Assignees</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {project.data?.members.map((m) => {
            const selected = assigneeIds.includes(m.user.id);
            return (
              <button
                type="button"
                key={m.user.id}
                onClick={() => setAssigneeIds(toggle(assigneeIds, m.user.id))}
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1 ring-inset transition ${
                  selected
                    ? "bg-indigo-50 text-indigo-700 ring-indigo-300"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                  {m.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.user.image}
                      alt={m.user.name ?? m.user.email}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initialsFromName(m.user.name, m.user.email)
                  )}
                </span>
                {m.user.name ?? m.user.email}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Tags</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.data?.length === 0 && (
            <p className="text-xs text-slate-500">
              No tags yet. Create some from the project sidebar.
            </p>
          )}
          {tags.data?.map((t) => {
            const selected = tagIds.includes(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => setTagIds(toggle(tagIds, t.id))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ring-1 ring-inset transition ${
                  selected ? "ring-2" : "hover:bg-slate-50"
                }`}
                style={{
                  color: t.color,
                  backgroundColor: selected ? `${t.color}20` : "white",
                  borderColor: t.color,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
