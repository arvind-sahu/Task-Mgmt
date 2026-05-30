import { useRouter } from "next/router";
import { TaskStatus } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import type { GetServerSidePropsContext } from "next";

import EmptyState from "~/components/EmptyState";
import Layout from "~/components/Layout";
import { ProjectSettingsPanel } from "~/components/ProjectSettingsPanel";
import TaskCard from "~/components/TaskCard";
import { canManageProject } from "~/utils/projectRole";
import TaskForm, { type TaskFormValues } from "~/components/TaskForm";
import { TASK_STATUSES, statusLabel } from "~/components/Badges";
import { requireAuth } from "~/server/auth";
import { api, type RouterOutputs } from "~/utils/api";
import { initialsFromName } from "~/utils/avatar";

/**
 * Project detail page. Layout:
 *   - Left: Kanban (one column per TaskStatus)
 *   - Right: sidebar with members + tags
 *
 * The "New task" button reveals an inline TaskForm above the board so users
 * never lose project context.
 */
export default function ProjectDetail() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  const utils = api.useUtils();
  const project = api.project.byId.useQuery({ id }, { enabled: !!id });
  const sprints = api.sprint.list.useQuery({ projectId: id }, { enabled: !!id });

  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSprintId, setActiveSprintId] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const taskListInput = {
    projectId: id,
    sprintId: activeSprintId || null,
    tagId: selectedTagId || undefined,
  };

  const tags = api.tag.list.useQuery({ projectId: id }, { enabled: !!id });
  const tasks = api.task.list.useQuery(
    taskListInput,
    { enabled: !!id },
  );
  const selectedTask = api.task.byId.useQuery(
    { id: selectedTaskId ?? "" },
    { enabled: !!selectedTaskId },
  );

  useEffect(() => {
    if (activeSprintId || !sprints.data?.length) return;
    const now = Date.now();
    const current =
      sprints.data.find((s) => {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        return start <= now && end >= now;
      }) ?? sprints.data[0];
    setActiveSprintId(current.id);
  }, [activeSprintId, sprints.data]);

  useEffect(() => {
    setTaskSearch("");
    setSelectedTaskId(null);
  }, [activeSprintId]);

  useEffect(() => {
    setSelectedTaskId(null);
  }, [taskSearch, selectedTagId, selectedMemberIds]);

  const createTask = api.task.create.useMutation({
    onSuccess: async () => {
      await utils.task.list.invalidate({ projectId: id });
      await utils.sprint.backlog.invalidate({ projectId: id });
      setShowCreate(false);
    },
  });

  const setStatus = api.task.setStatus.useMutation({
    // Optimistic UI: update the cached list immediately, roll back on error.
    onMutate: async (variables) => {
      if (!variables || typeof variables !== "object") return;
      const { id: taskId, status } = variables;
      if (!taskId || !status) return;
      await utils.task.list.cancel(taskListInput);
      const prev = utils.task.list.getData(taskListInput);
      utils.task.list.setData(taskListInput, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, status } : t)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.task.list.setData(taskListInput, ctx.prev);
      }
    },
    onSettled: () => {
      void utils.task.list.invalidate(taskListInput);
      void utils.sprint.backlog.invalidate({ projectId: id });
    },
  });
  const updateTask = api.task.update.useMutation({
    onSuccess: async () => {
      await utils.task.list.invalidate(taskListInput);
      if (selectedTaskId) {
        await utils.task.byId.invalidate({ id: selectedTaskId });
      }
    },
  });
  const createSprint = api.sprint.create.useMutation({
    onSuccess: async (sprint) => {
      setActiveSprintId(sprint.id);
      await utils.sprint.list.invalidate({ projectId: id });
    },
  });
  const updateSprint = api.sprint.update.useMutation({
    onSuccess: async () => {
      await utils.sprint.list.invalidate({ projectId: id });
    },
  });
  const activeSprint =
    sprints.data?.find((s) => s.id === activeSprintId) ?? null;
  const sprintTasks = tasks.data ?? [];
  const filteredTasks = sprintTasks.filter(
    (task) =>
      (selectedMemberIds.length === 0 ||
        task.assignees.some((assignee) =>
          selectedMemberIds.includes(assignee.id),
        )) &&
      matchesTaskSearch(task, taskSearch),
  );

  function syncBoardScroll(source: "top" | "board") {
    const top = topScrollRef.current;
    const board = boardScrollRef.current;
    if (!top || !board) return;
    if (source === "top") {
      board.scrollLeft = top.scrollLeft;
    } else {
      top.scrollLeft = board.scrollLeft;
    }
  }

  function scrollBoardWithWheel(delta: number) {
    const top = topScrollRef.current;
    const board = boardScrollRef.current;
    if (!top || !board) return;
    top.scrollLeft += delta;
    board.scrollLeft = top.scrollLeft;
  }

  function handleCreate(values: TaskFormValues) {
    createTask.mutate({
      projectId: id,
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      deadline: values.deadline ? new Date(values.deadline) : null,
      sprintId: values.sprintId ?? (activeSprintId || null),
      assigneeIds: values.assigneeIds,
      tagIds: values.tagIds,
    });
  }

  function handleTaskEdit(values: TaskFormValues) {
    if (!selectedTaskId) return;
    updateTask.mutate({
      id: selectedTaskId,
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      deadline: values.deadline ? new Date(values.deadline) : null,
      sprintId: values.sprintId,
      assigneeIds: values.assigneeIds,
      tagIds: values.tagIds,
    });
  }

  // Render explicit states so the page never gets stuck on a spinner if the
  // id is bogus, the project was deleted, or the user lost access.
  if (project.isLoading) {
    return (
      <Layout title="Project">
        <p className="text-sm text-slate-500">Loading…</p>
      </Layout>
    );
  }
  if (project.error || !project.data) {
    const code = project.error?.data?.code;
    const isAuthError = code === "FORBIDDEN" || code === "NOT_FOUND";
    return (
      <Layout title="Project">
        <EmptyState
          title={isAuthError ? "Project unavailable" : "Something went wrong"}
          message={
            isAuthError
              ? "This project doesn't exist or you don't have access to it."
              : (project.error?.message ?? "Failed to load this project.")
          }
          action={{ href: "/projects", label: "Back to projects" }}
        />
      </Layout>
    );
  }

  const canManage = canManageProject(project.data.currentUserRole);
  const pendingInvites: PendingInvite[] =
    canManage && "invites" in project.data
      ? project.data.invites
          .filter(
            (inv): inv is typeof inv & { id: string; email: string } =>
              Boolean(inv.id) && Boolean(inv.email),
          )
          .map((inv) => ({
            id: inv.id,
            email: inv.email,
            role: inv.role ?? "MEMBER",
            createdAt: inv.createdAt ? new Date(inv.createdAt) : new Date(),
          }))
      : [];
  const projectMembers = buildProjectMembers(project.data);
  const selectedMemberLabels = selectedMemberIds
    .map((memberId) => {
      const member = projectMembers.find((item) => item.user.id === memberId);
      return member?.user.name ?? member?.user.email;
    })
    .filter(Boolean);

  return (
    <Layout
      title={project.data.name}
      headerTitle={project.data.name}
      compactBrand
      contentClassName="mx-auto w-full min-w-0 max-w-none flex-1 px-2 py-2 sm:px-3 lg:px-4"
    >
      {showCreate && (
        <div className="card mb-3">
          <h2 className="mb-4 text-lg font-semibold">Create task</h2>
          <TaskForm
            projectId={id}
            initial={{
              sprintId: activeSprintId || null,
              status: TaskStatus.BACKLOG,
              deadline: activeSprint
                ? dateInputValue(new Date(activeSprint.endDate))
                : undefined,
            }}
            sprintOptions={(sprints.data ?? []).map((sprint) => ({
              id: sprint.id,
              name: sprint.name,
              startDate: sprint.startDate,
              endDate: sprint.endDate,
            }))}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            submitting={createTask.isPending}
            submitLabel="Create task"
          />
          {createTask.error && (
            <p className="mt-3 text-sm text-red-600">
              {createTask.error.message}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[14rem_minmax(0,1fr)_12.8rem] 2xl:grid-cols-[15rem_minmax(0,1fr)_13.6rem]">
        <aside className="space-y-4">
          <SprintSidebar
            canManage={canManage}
            durationWeeks={project.data.sprintDurationWeeks}
            sprints={sprints.data ?? []}
            activeSprintId={activeSprintId}
            activeSprint={activeSprint}
            onSelectSprint={setActiveSprintId}
            onCreateSprint={(input) =>
              createSprint.mutate({ projectId: id, ...input })
            }
            onUpdateSprint={(input) => updateSprint.mutate(input)}
            creatingSprint={createSprint.isPending}
            updatingSprintId={
              updateSprint.variables && typeof updateSprint.variables === "object"
                ? updateSprint.variables.id
                : undefined
            }
            createSprintError={createSprint.error?.message}
            updateSprintError={updateSprint.error?.message}
          />
        </aside>

        <section className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Task board
              </p>
              <h2 className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-lg font-semibold text-slate-900">
                <span className="truncate">
                  {activeSprint ? activeSprint.name : "Backlog tasks"}
                </span>
                {selectedMemberLabels.length > 0 && (
                  <span className="text-xs font-normal text-slate-500">
                    Showing tasks assigned to{" "}
                    <span className="font-semibold text-slate-700">
                      {selectedMemberLabels.join(", ")}
                    </span>
                    <span className="mx-1.5 text-slate-300">·</span>
                  </span>
                )}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative w-56 sm:w-64">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                >
                  🔍
                </span>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-[4.5rem] text-xs text-slate-900 shadow-sm outline-none ring-2 ring-transparent transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-100"
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={(event) => setTaskSearch(event.target.value)}
                />
                {taskSearch && (
                  <button
                    type="button"
                    className="absolute right-14 top-1/2 -translate-y-1/2 rounded px-1 text-sm font-bold text-slate-400 transition hover:text-slate-700"
                    onClick={() => setTaskSearch("")}
                    aria-label="Clear task search"
                  >
                    ×
                  </button>
                )}
                <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {filteredTasks.length}/{sprintTasks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate((s) => !s)}
                className={`h-9 shrink-0 rounded-lg border px-3 text-xs font-medium transition ${
                  showCreate
                    ? "border-slate-300 bg-slate-100 text-slate-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {showCreate ? "Cancel" : "New task"}
              </button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${
                selectedTagId === null
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
              onClick={() => setSelectedTagId(null)}
            >
              All tags
            </button>
            {tags.data?.map((tag) => {
              const selected = selectedTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${
                    selected ? "ring-2" : "hover:bg-slate-50"
                  }`}
                  style={{
                    color: selected ? "white" : tag.color,
                    backgroundColor: selected ? tag.color : `${tag.color}12`,
                    borderColor: tag.color,
                  }}
                  onClick={() =>
                    setSelectedTagId((current) =>
                      current === tag.id ? null : tag.id,
                    )
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: selected ? "white" : tag.color,
                    }}
                  />
                  {tag.name}
                </button>
              );
            })}
          </div>
          {selectedTaskId ? (
            <TaskDetailPanel
              task={selectedTask.data}
              loading={selectedTask.isLoading}
              error={selectedTask.error?.message}
              sprintOptions={(sprints.data ?? []).map((sprint) => ({
                id: sprint.id,
                name: sprint.name,
                startDate: sprint.startDate,
                endDate: sprint.endDate,
              }))}
              submitting={updateTask.isPending}
              updateError={updateTask.error?.message}
              onBack={() => setSelectedTaskId(null)}
              onSubmit={handleTaskEdit}
            />
          ) : (
            <>
              <div
                ref={topScrollRef}
                className="mb-2 h-4 overflow-x-auto overflow-y-hidden"
                onScroll={() => syncBoardScroll("top")}
                aria-label="Task board horizontal scroll"
              >
                <div className="h-1 min-w-[86rem]" />
              </div>
              <div
                ref={boardScrollRef}
                className="overflow-x-hidden pb-2"
                onScroll={() => syncBoardScroll("board")}
                onWheel={(event) => {
                  const delta =
                    Math.abs(event.deltaX) > Math.abs(event.deltaY)
                      ? event.deltaX
                      : event.deltaY;
                  if (delta === 0) return;
                  event.preventDefault();
                  scrollBoardWithWheel(delta);
                }}
              >
                {taskSearch.trim() && filteredTasks.length === 0 && (
                  <div className="mb-3 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-600">
                    <p className="font-semibold">
                      ✨ No tasks match &quot;{taskSearch.trim()}&quot;.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try different keywords.
                    </p>
                  </div>
                )}
                <div className="grid min-w-[86rem] grid-cols-5 gap-3">
                {TASK_STATUSES.map((s) => {
                  const colTasks = filteredTasks.filter((t) => t.status === s);
                  return (
                    <div
                      key={s}
                      className="rounded-xl bg-slate-100 p-3"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const taskId = e.dataTransfer.getData("text/plain");
                        if (taskId) setStatus.mutate({ id: taskId, status: s });
                      }}
                    >
                      <div className="mb-3 flex items-center justify-between px-1">
                        <h3 className="text-sm font-semibold text-slate-700">
                          {statusLabel[s]}
                        </h3>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">
                          {colTasks.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {colTasks.length === 0 && (
                          <p className="px-2 py-3 text-xs text-slate-400">
                            {taskSearch.trim()
                              ? `No tasks match "${taskSearch.trim()}"`
                              : "No tasks"}
                          </p>
                        )}
                        {colTasks.map((t) => (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData("text/plain", t.id)
                            }
                          >
                            <TaskCard
                              task={t}
                              searchQuery={taskSearch}
                              onOpen={setSelectedTaskId}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="space-y-3">
          {canManage && (
            <button
              type="button"
              onClick={() => setShowSettings((value) => !value)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition ${
                showSettings
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
              }`}
              aria-expanded={showSettings}
            >
              <span
                aria-hidden="true"
                className="grid h-6 w-6 place-items-center rounded-lg border border-current text-xs"
              >
                G
              </span>
              Project settings
            </button>
          )}
          <ProjectMembersPanel
            projectId={id}
            members={projectMembers}
            canManage={canManage}
            pendingInvites={pendingInvites}
            selectedMemberIds={selectedMemberIds}
            memberSearch={memberSearch}
            openMenuMemberId={memberMenuId}
            onMemberSearch={setMemberSearch}
            onToggleMember={(memberId) =>
              setSelectedMemberIds((current) =>
                current.includes(memberId)
                  ? current.filter((id) => id !== memberId)
                  : [...current, memberId],
              )
            }
            onClearMembers={() => setSelectedMemberIds([])}
            onDeselectMember={(memberId) =>
              setSelectedMemberIds((current) =>
                current.filter((id) => id !== memberId),
              )
            }
            onToggleMenu={(memberId) =>
              setMemberMenuId((current) =>
                current === memberId ? null : memberId,
              )
            }
            onCloseMenu={() => setMemberMenuId(null)}
          />
          {canManage && showSettings && (
            <ProjectSettingsPanel
              projectId={id}
              initial={{
                name: project.data.name,
                description: project.data.description,
                color: project.data.color,
                sprintDurationWeeks: project.data.sprintDurationWeeks,
              }}
            >
              <TagsPanel projectId={id} canManage={canManage} />
            </ProjectSettingsPanel>
          )}
        </aside>
      </div>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Sprint planning
// ---------------------------------------------------------------------------

type SprintListItem = RouterOutputs["sprint"]["list"][number];
type TaskDetailItem = RouterOutputs["task"]["byId"];
type TaskListItem = RouterOutputs["task"]["list"][number];
type ProjectDetailData = RouterOutputs["project"]["byId"];
type ProjectMemberItem = ProjectDetailData["members"][number];

function buildProjectMembers(project: ProjectDetailData): ProjectMemberItem[] {
  const hasOwnerMembership = project.members.some(
    (member) => member.user.id === project.owner.id,
  );
  if (hasOwnerMembership) return project.members;

  return [
    {
      id: `owner-${project.owner.id}`,
      role: "OWNER",
      joinedAt: project.createdAt,
      userId: project.owner.id,
      projectId: project.id,
      user: project.owner,
    },
    ...project.members,
  ];
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function taskSearchText(task: TaskListItem) {
  return normalizeSearchText(`${task.title} ${task.description ?? ""}`);
}

function canSegmentJoinedQuery(query: string, taskText: string) {
  const compactQuery = query.replace(/\s+/g, "");
  if (compactQuery.length < 6 || taskText.includes(compactQuery)) return false;
  const memo = new Map<number, boolean>();

  function walk(index: number, parts: number): boolean {
    if (index === compactQuery.length) return parts >= 2;
    const cached = memo.get(index * 100 + parts);
    if (cached !== undefined) return cached;

    for (let end = index + 3; end <= compactQuery.length; end += 1) {
      const segment = compactQuery.slice(index, end);
      if (taskText.includes(segment) && walk(end, parts + 1)) {
        memo.set(index * 100 + parts, true);
        return true;
      }
    }

    memo.set(index * 100 + parts, false);
    return false;
  }

  return walk(0, 0);
}

function matchesTaskSearch(task: TaskListItem, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const text = taskSearchText(task);
  if (text.includes(normalizedQuery)) return true;

  const words = normalizedQuery.match(/[a-z0-9#._-]+/g) ?? [];
  if (words.length > 1 && words.every((word) => text.includes(word))) {
    return true;
  }

  if (words.length === 1 && canSegmentJoinedQuery(words[0] ?? "", text)) {
    return true;
  }

  return false;
}

function TaskDetailPanel({
  task,
  loading,
  error,
  sprintOptions,
  submitting,
  updateError,
  onBack,
  onSubmit,
}: {
  task?: TaskDetailItem;
  loading: boolean;
  error?: string;
  sprintOptions: Array<{
    id: string;
    name: string;
    startDate: Date | string;
    endDate: Date | string;
  }>;
  submitting: boolean;
  updateError?: string;
  onBack: () => void;
  onSubmit: (values: TaskFormValues) => void;
}) {
  const [title, setTitle] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [priority, setPriority] = useState<TaskDetailItem["priority"]>("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const lastSavedKeyRef = useRef("");
  const suppressNextTextBlurRef = useRef(false);
  const project = api.project.byId.useQuery(
    { id: task?.projectId ?? "" },
    { enabled: !!task?.projectId },
  );
  const tags = api.tag.list.useQuery(
    { projectId: task?.projectId ?? "" },
    { enabled: !!task?.projectId },
  );

  useEffect(() => {
    if (!task) return;
    const nextDeadline = task.deadline
      ? new Date(task.deadline).toISOString().slice(0, 10)
      : "";
    const nextAssigneeIds = task.assignees.map((assignee) => assignee.id);
    const nextTagIds = task.tags.map((tag) => tag.id);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setDeadline(nextDeadline);
    setSprintId(task.sprintId);
    setAssigneeIds(nextAssigneeIds);
    setTagIds(nextTagIds);
    lastSavedKeyRef.current = JSON.stringify({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      deadline: nextDeadline,
      sprintId: task.sprintId,
      assigneeIds: nextAssigneeIds,
      tagIds: nextTagIds,
    });
  }, [task]);

  useEffect(() => {
    if (!task) return;
    const payload = {
      title: title.trim(),
      description,
      status,
      priority,
      deadline,
      sprintId,
      assigneeIds,
      tagIds,
    };
    const key = JSON.stringify(payload);
    const original = JSON.parse(lastSavedKeyRef.current || "{}") as {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskDetailItem["priority"];
      deadline?: string;
      sprintId?: string | null;
      assigneeIds?: string[];
      tagIds?: string[];
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
      onSubmit({
        title: autosavePayload.title,
        description: autosavePayload.description || undefined,
        status: payload.status,
        priority: payload.priority,
        deadline: payload.deadline || undefined,
        sprintId: payload.sprintId,
        assigneeIds: payload.assigneeIds,
        tagIds: payload.tagIds,
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    task,
    title,
    description,
    status,
    priority,
    deadline,
    sprintId,
    assigneeIds,
    tagIds,
    onSubmit,
  ]);

  function saveTextField(overrides: { title?: string; description?: string }) {
    if (!task) return;
    const nextTitle = (overrides.title ?? title).trim();
    if (!nextTitle) {
      setTitle(task.title);
      return;
    }
    const nextDescription = overrides.description ?? description;
    const payload = {
      title: nextTitle,
      description: nextDescription,
      status,
      priority,
      deadline,
      sprintId,
      assigneeIds,
      tagIds,
    };
    const key = JSON.stringify(payload);
    if (key === lastSavedKeyRef.current) return;
    lastSavedKeyRef.current = key;
    onSubmit({
      title: payload.title,
      description: payload.description || undefined,
      status: payload.status,
      priority: payload.priority,
      deadline: payload.deadline || undefined,
      sprintId: payload.sprintId,
      assigneeIds: payload.assigneeIds,
      tagIds: payload.tagIds,
    });
  }

  function toggleValue(values: string[], id: string) {
    return values.includes(id)
      ? values.filter((value) => value !== id)
      : [...values, id];
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
          Back to task board
        </button>
        <p className="text-sm text-red-600">{error ?? "Task not found."}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
              onClick={onBack}
              aria-label="Back to task board"
            >
              ←
            </button>
            {titleEditing ? (
              <textarea
                className="min-w-0 flex-1 resize-none rounded-xl border border-indigo-300 bg-white px-2 py-1 text-xl font-semibold leading-7 text-slate-900 outline-none ring-4 ring-indigo-100"
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
            ) : (
              <button
                type="button"
                className="line-clamp-2 min-w-0 flex-1 rounded-xl px-2 py-1 text-left text-xl font-semibold leading-7 text-slate-900 transition hover:bg-slate-100"
                onClick={() => setTitleEditing(true)}
                title={title}
              >
                {title}
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {assigneeIds.length === 0 ? (
              <span className="text-xs text-slate-500">No assignee</span>
            ) : (
              project.data?.members
                .filter((member) => assigneeIds.includes(member.user.id))
                .map((member) => (
                  <span
                    key={member.user.id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  >
                    <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                      {member.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.user.image}
                          alt={member.user.name ?? member.user.email}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initialsFromName(member.user.name, member.user.email)
                      )}
                    </span>
                    {member.user.name ?? member.user.email}
                  </span>
                ))
            )}
          </div>
        </div>
        <div className="w-full shrink-0 xl:w-56">
          <label className="label text-xs">Sprint</label>
          <select
            className="input mt-1 h-10 text-sm"
            value={sprintId ?? ""}
            onChange={(event) => setSprintId(event.target.value || null)}
          >
            <option value="">Backlog</option>
            {sprintOptions.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4">
        <div>
          <label className="label">Description</label>
          {descriptionEditing ? (
            <textarea
              className={`mt-1 w-full resize-none rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm leading-6 text-slate-700 outline-none ring-4 ring-indigo-100 ${
                descriptionExpanded
                  ? "max-h-72 overflow-y-auto"
                  : "max-h-36 overflow-hidden"
              }`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={() => {
                if (suppressNextTextBlurRef.current) {
                  suppressNextTextBlurRef.current = false;
                  return;
                }
                setDescriptionEditing(false);
                saveTextField({ description });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.ctrlKey) {
                  event.preventDefault();
                  setDescriptionEditing(false);
                  saveTextField({ description });
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  suppressNextTextBlurRef.current = true;
                  setDescription(task.description ?? "");
                  setDescriptionEditing(false);
                  event.currentTarget.blur();
                }
              }}
              rows={descriptionExpanded ? 10 : 4}
              maxLength={5000}
              autoFocus
              placeholder="Add task description..."
            />
          ) : (
            <button
              type="button"
              className={`mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm leading-6 text-slate-700 transition hover:bg-slate-100 ${
                descriptionExpanded ? "max-h-72 overflow-y-auto" : "line-clamp-5"
              }`}
              onClick={() => setDescriptionEditing(true)}
            >
              {description ? (
                <span className="whitespace-pre-wrap">{description}</span>
              ) : (
                <span className="italic text-slate-400">
                  Add task description...
                </span>
              )}
            </button>
          )}
          {(description.length > 240 || description.split("\n").length > 5) && (
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-indigo-600 hover:underline"
              onClick={() => setDescriptionExpanded((value) => !value)}
            >
              {descriptionExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Status</label>
            <select
              className="input mt-1"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {statusLabel[item]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input mt-1"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskDetailItem["priority"])
              }
            >
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((item) => (
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

        <div>
          <label className="label">Assignees</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {project.data?.members.map((member) => {
              const selected = assigneeIds.includes(member.user.id);
              return (
                <button
                  key={member.user.id}
                  type="button"
                  onClick={() =>
                    setAssigneeIds((current) =>
                      toggleValue(current, member.user.id),
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1 ring-inset transition ${
                    selected
                      ? "bg-indigo-50 text-indigo-700 ring-indigo-300"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                    {member.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.user.image}
                        alt={member.user.name ?? member.user.email}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initialsFromName(member.user.name, member.user.email)
                    )}
                  </span>
                  {member.user.name ?? member.user.email}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Tags</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.data?.length === 0 && (
              <p className="text-xs text-slate-500">No tags yet.</p>
            )}
            {tags.data?.map((tag) => {
              const selected = tagIds.includes(tag.id);
              return (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() =>
                    setTagIds((current) => toggleValue(current, tag.id))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ring-1 ring-inset transition ${
                    selected ? "ring-2" : "hover:bg-slate-50"
                  }`}
                  style={{
                    color: tag.color,
                    backgroundColor: selected ? `${tag.color}20` : "white",
                    borderColor: tag.color,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        {submitting ? "Saving changes..." : "Changes auto-save."}
      </p>
      {updateError && <p className="mt-3 text-sm text-red-600">{updateError}</p>}
    </div>
  );
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatSprintRange(start: Date | string, end: Date | string) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}

type SprintPhase = "current" | "past" | "upcoming";

function getSprintPhase(
  sprint: SprintListItem,
  now = new Date(),
): SprintPhase {
  const start = new Date(sprint.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate);
  end.setHours(23, 59, 59, 999);
  const ts = now.getTime();
  if (ts >= start.getTime() && ts <= end.getTime()) return "current";
  if (ts > end.getTime()) return "past";
  return "upcoming";
}

const sprintPhaseMeta: Record<
  SprintPhase,
  { label: string; card: string; badge: string; accent: string }
> = {
  current: {
    label: "Current",
    card: "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 shadow-sm ring-1 ring-emerald-200/70",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    accent: "bg-emerald-500",
  },
  past: {
    label: "Past",
    card: "border-slate-200 bg-slate-50/80",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    accent: "bg-slate-300",
  },
  upcoming: {
    label: "Upcoming",
    card: "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50/30 ring-1 ring-sky-100",
    badge: "bg-sky-100 text-sky-800 ring-sky-200",
    accent: "bg-sky-400",
  },
};

function sprintCardClassName(phase: SprintPhase, isActive: boolean) {
  const meta = sprintPhaseMeta[phase];
  return [
    "relative cursor-pointer overflow-hidden rounded-xl border p-2.5 pl-3.5 transition",
    meta.card,
    isActive ? "ring-2 ring-indigo-400 ring-offset-1" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function sprintAnalysis(sprint: SprintListItem) {
  const total = sprint.tasks.length;
  const completed = sprint.tasks.filter(
    (task) => task.status === TaskStatus.DONE,
  ).length;
  const todo = sprint.tasks.filter(
    (task) => task.status === TaskStatus.TODO,
  ).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const now = Date.now();
  const start = new Date(sprint.startDate).getTime();
  const end = new Date(sprint.endDate).getTime();
  const elapsed =
    end <= start
      ? 100
      : Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));

  if (total === 0) {
    return { total, completed, todo, percent, label: "Planning", tone: "slate" };
  }
  if (percent === 100) {
    return { total, completed, todo, percent, label: "Completed", tone: "emerald" };
  }
  if (now > end) {
    return { total, completed, todo, percent, label: "Off track", tone: "red" };
  }
  if (percent + 10 >= elapsed) {
    return { total, completed, todo, percent, label: "On track", tone: "emerald" };
  }
  return { total, completed, todo, percent, label: "At risk", tone: "amber" };
}

function SprintSidebar({
  canManage,
  durationWeeks,
  sprints,
  activeSprintId,
  activeSprint,
  onSelectSprint,
  onCreateSprint,
  onUpdateSprint,
  creatingSprint,
  updatingSprintId,
  createSprintError,
  updateSprintError,
}: {
  canManage: boolean;
  durationWeeks: number;
  sprints: SprintListItem[];
  activeSprintId: string;
  activeSprint: SprintListItem | null;
  onSelectSprint: (id: string) => void;
  onCreateSprint: (input: {
    name?: string;
    startDate: Date;
    endDate?: Date;
  }) => void;
  onUpdateSprint: (input: {
    id: string;
    name?: string;
    startDate?: Date;
    endDate?: Date;
  }) => void;
  creatingSprint: boolean;
  updatingSprintId?: string;
  createSprintError?: string;
  updateSprintError?: string;
}) {
  const today = dateInputValue(new Date());
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [mode, setMode] = useState<"CONFIGURED" | "CUSTOM">("CONFIGURED");
  const [endDate, setEndDate] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuSprintId, setMenuSprintId] = useState<string | null>(null);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const suppressSprintNameBlurRef = useRef(false);

  return (
    <section className="card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Sprints
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-slate-900">
            {activeSprint
              ? activeSprint.name
              : "Select sprint"}
          </h2>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn-primary shrink-0 px-3 py-1.5 text-xs"
            onClick={() => setShowCreateModal(true)}
          >
            Create sprint
          </button>
        )}
      </div>

      <div className="mt-4 max-h-[calc(100vh-18rem)] space-y-2 overflow-y-auto pr-1">
        {sprints.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No sprints yet. Create a sprint to start planning work.
          </p>
        )}
        {sprints.map((sprint) => {
          const analysis = sprintAnalysis(sprint);
          const isEditing = editingSprintId === sprint.id;
          const phase = getSprintPhase(sprint);
          const phaseMeta = sprintPhaseMeta[phase];
          const isActive = sprint.id === activeSprintId;
          return (
            <div
              key={sprint.id}
              className={sprintCardClassName(phase, isActive)}
              onClick={() => onSelectSprint(sprint.id)}
            >
              <span
                className={`absolute bottom-2 left-0 top-2 w-1 rounded-full ${phaseMeta.accent}`}
                aria-hidden="true"
              />
              <div className="w-full pr-8 text-left">
                {isEditing ? (
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    value={editName}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setEditName(event.target.value)}
                    onBlur={() => {
                      if (suppressSprintNameBlurRef.current) {
                        suppressSprintNameBlurRef.current = false;
                        return;
                      }
                      if (!editName.trim()) {
                        setEditName(sprint.name);
                        setEditingSprintId(null);
                        return;
                      }
                      onUpdateSprint({
                        id: sprint.id,
                        name: editName,
                        startDate: new Date(editStartDate),
                        endDate: new Date(editEndDate),
                      });
                      setEditingSprintId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onUpdateSprint({
                          id: sprint.id,
                          name: editName,
                          startDate: new Date(editStartDate),
                          endDate: new Date(editEndDate),
                        });
                        setEditingSprintId(null);
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        suppressSprintNameBlurRef.current = true;
                        setEditName(sprint.name);
                        setEditingSprintId(null);
                      }
                    }}
                    autoFocus
                    maxLength={120}
                  />
                ) : (
                  <div className="flex min-w-0 items-start gap-1.5">
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate rounded-md px-1 py-0.5 text-left text-sm font-semibold text-slate-900 transition hover:bg-white/60"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (canManage) {
                          setEditingSprintId(sprint.id);
                          setEditName(sprint.name);
                          setEditStartDate(
                            dateInputValue(new Date(sprint.startDate)),
                          );
                          setEditEndDate(dateInputValue(new Date(sprint.endDate)));
                        } else {
                          onSelectSprint(sprint.id);
                        }
                      }}
                      title={sprint.name}
                    >
                      {sprint.name}
                    </button>
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ring-1 ring-inset ${phaseMeta.badge}`}
                    >
                      {phaseMeta.label}
                    </span>
                  </div>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {formatSprintRange(sprint.startDate, sprint.endDate)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  {analysis.total} tasks
                </p>
              </div>
              {canManage && (
                <div className="absolute right-2 top-2">
                  <button
                    type="button"
                    className="rounded-full px-2 py-0.5 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    aria-label={`Open ${sprint.name} sprint menu`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuSprintId((current) =>
                        current === sprint.id ? null : sprint.id,
                      );
                    }}
                  >
                    ...
                  </button>
                  {menuSprintId === sprint.id && (
                    <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                      <button
                        type="button"
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingSprintId(sprint.id);
                          setEditName(sprint.name);
                          setEditStartDate(dateInputValue(new Date(sprint.startDate)));
                          setEditEndDate(dateInputValue(new Date(sprint.endDate)));
                          setMenuSprintId(null);
                        }}
                      >
                        Edit sprint
                      </button>
                    </div>
                  )}
                </div>
              )}
              {isEditing && (
                <form
                  className="mt-3 space-y-2 border-t border-slate-200 pt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onUpdateSprint({
                      id: sprint.id,
                      name: editName,
                      startDate: new Date(editStartDate),
                      endDate: new Date(editEndDate),
                    });
                    setEditingSprintId(null);
                  }}
                >
                  <input
                    className="input"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    onBlur={() => {
                      if (!editName.trim()) return;
                      onUpdateSprint({
                        id: sprint.id,
                        name: editName,
                        startDate: new Date(editStartDate),
                        endDate: new Date(editEndDate),
                      });
                      setEditingSprintId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onUpdateSprint({
                          id: sprint.id,
                          name: editName,
                          startDate: new Date(editStartDate),
                          endDate: new Date(editEndDate),
                        });
                        setEditingSprintId(null);
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setEditName(sprint.name);
                        setEditingSprintId(null);
                      }
                    }}
                    required
                  />
                  <input
                    type="date"
                    className="input"
                    value={editStartDate}
                    onChange={(event) => setEditStartDate(event.target.value)}
                    required
                  />
                  <input
                    type="date"
                    className="input"
                    value={editEndDate}
                    onChange={(event) => setEditEndDate(event.target.value)}
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn-primary flex-1"
                      disabled={updatingSprintId === sprint.id}
                    >
                      {updatingSprintId === sprint.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost flex-1"
                      onClick={() => setEditingSprintId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                  {updateSprintError && updatingSprintId === sprint.id && (
                    <p className="text-xs text-red-600">{updateSprintError}</p>
                  )}
                </form>
              )}
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateSprint({
                name: name || undefined,
                startDate: new Date(startDate),
                endDate:
                  mode === "CUSTOM" && endDate ? new Date(endDate) : undefined,
              });
              setName("");
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Create sprint
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Dates must be continuous with existing sprints and cannot
                  overlap.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close create sprint modal"
              >
                x
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Sprint name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
              <select
                className="input"
                value={mode}
                onChange={(event) =>
                  setMode(
                    event.target.value === "CUSTOM" ? "CUSTOM" : "CONFIGURED",
                  )
                }
              >
                <option value="CONFIGURED">
                  {durationWeeks === 2 ? "Biweekly" : "Weekly"}
                </option>
                <option value="CUSTOM">Custom dates</option>
              </select>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={mode !== "CUSTOM"}
                required={mode === "CUSTOM"}
              />
              <button className="btn-primary w-full" disabled={creatingSprint}>
                {creatingSprint ? "Creating..." : "Create sprint"}
              </button>
              {createSprintError && (
                <p className="text-xs text-red-600">{createSprintError}</p>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sidebar panels
// ---------------------------------------------------------------------------

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
};

function ProjectMembersPanel({
  projectId,
  members,
  canManage,
  pendingInvites,
  selectedMemberIds,
  memberSearch,
  openMenuMemberId,
  onMemberSearch,
  onToggleMember,
  onClearMembers,
  onDeselectMember,
  onToggleMenu,
  onCloseMenu,
}: {
  projectId: string;
  members: ProjectMemberItem[];
  canManage: boolean;
  pendingInvites: PendingInvite[];
  selectedMemberIds: string[];
  memberSearch: string;
  openMenuMemberId: string | null;
  onMemberSearch: (value: string) => void;
  onToggleMember: (memberId: string) => void;
  onClearMembers: () => void;
  onDeselectMember: (memberId: string) => void;
  onToggleMenu: (memberId: string) => void;
  onCloseMenu: () => void;
}) {
  const utils = api.useUtils();
  const [email, setEmail] = useState("");
  const hasMemberFilter = selectedMemberIds.length > 0;
  const normalizedMemberSearch = memberSearch.toLowerCase().trim();
  const visibleMembers = normalizedMemberSearch
    ? members.filter((member) =>
        `${member.user.name ?? ""} ${member.user.email}`
          .toLowerCase()
          .includes(normalizedMemberSearch),
      )
    : members;

  const invite = api.project.inviteMember.useMutation({
    onSuccess: async (res) => {
      await utils.project.byId.invalidate({ id: projectId });
      setEmail("");
      if (res.kind === "invite") {
        alert("Invite sent. They can join after registering with that email.");
      }
    },
  });
  const remove = api.project.removeMember.useMutation({
    onSuccess: async (_result, variables) => {
      if (variables && variables.userId) {
        onDeselectMember(variables.userId);
      }
      onCloseMenu();
      await utils.project.byId.invalidate({ id: projectId });
      await utils.task.list.invalidate({ projectId });
    },
  });
  const cancelInvite = api.project.cancelInvite.useMutation({
    onSuccess: () => utils.project.byId.invalidate({ id: projectId }),
  });

  return (
    <section className="card p-2.5">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">Members</h3>
      <label className="sr-only" htmlFor="project-member-search">
        Search project members
      </label>
      <div className="relative mb-2">
        {hasMemberFilter && (
          <span
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-600"
            aria-hidden="true"
          >
            <FilterIcon />
          </span>
        )}
        <input
          id="project-member-search"
          className={`h-9 w-full rounded-lg border text-xs outline-none ring-4 ring-transparent transition placeholder:text-slate-400 focus:ring-indigo-100 ${
            hasMemberFilter
              ? "border-indigo-300 bg-indigo-50/60 pl-8 pr-14 text-slate-900 focus:border-indigo-400 focus:bg-white"
              : "border-slate-200 bg-slate-50 px-3 text-slate-900 focus:border-indigo-400 focus:bg-white"
          }`}
          placeholder="Search members..."
          value={memberSearch}
          onChange={(event) => onMemberSearch(event.target.value)}
        />
        {hasMemberFilter && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 hover:underline"
            onClick={onClearMembers}
          >
            Clear
          </button>
        )}
      </div>

      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {visibleMembers.map((member) => {
          const label = member.user.name ?? member.user.email;
          const selected = selectedMemberIds.includes(member.user.id);
          return (
            <li
              key={member.id}
              className={`relative flex items-center gap-1 rounded-lg border px-1 py-1 transition ${
                selected
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 pl-0.5 pr-1 text-left"
                onClick={() => onToggleMember(member.user.id)}
                title={`${selected ? "Remove" : "Add"} filter for ${label}`}
              >
                <MemberAvatar member={member} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-800">
                    {label}
                  </span>
                  <span className="block text-[10px] uppercase text-slate-500">
                    {member.role}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                onClick={() => onToggleMenu(member.user.id)}
                aria-label={`Open actions for ${label}`}
                aria-expanded={openMenuMemberId === member.user.id}
              >
                ...
              </button>
              {openMenuMemberId === member.user.id && (
                <div className="absolute right-0 top-9 z-40 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      onCloseMenu();
                      alert(
                        `${label}\n${member.user.email}\nRole: ${member.role}`,
                      );
                    }}
                  >
                    View profile
                  </button>
                  {canManage && member.role !== "OWNER" && (
                    <button
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() =>
                        remove.mutate({ projectId, userId: member.user.id })
                      }
                      disabled={remove.isPending}
                    >
                      Remove from project
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {visibleMembers.length === 0 && (
          <li className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            No members match this search.
          </li>
        )}
      </ul>

      {canManage && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate({ projectId, email });
            }}
          >
            <input
              className="input h-9 w-full text-xs"
              type="email"
              placeholder="Invite by email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              className="btn-primary h-9 w-full text-xs"
              disabled={invite.isPending}
            >
              {invite.isPending ? "Sending..." : "Invite"}
            </button>
          </form>
          {pendingInvites.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase text-slate-500">
                Pending
              </p>
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700 ring-1 ring-amber-100"
                >
                  <span className="truncate">{inv.email}</span>
                  <button
                    type="button"
                    className="shrink-0 font-bold text-red-600 hover:underline"
                    onClick={() => cancelInvite.mutate({ inviteId: inv.id })}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
          {invite.error && (
            <p className="text-xs text-red-600">{invite.error.message}</p>
          )}
        </div>
      )}
    </section>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M3 4.5a1 1 0 011-1h12a1 1 0 011 1v1.2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-4 2A1 1 0 016 17v-5.586L3.293 5.407A1 1 0 013 4.7V4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MemberAvatar({ member }: { member: ProjectMemberItem }) {
  const label = member.user.name ?? member.user.email;
  const initials = initialsFromName(member.user.name, member.user.email);
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 ring-2 ring-white">
      {member.user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.user.image}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        initials
      )}
    </span>
  );
}

function TagsPanel({
  projectId,
  canManage,
}: {
  projectId: string;
  canManage: boolean;
}) {
  const utils = api.useUtils();
  const tags = api.tag.list.useQuery({ projectId });
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366F1");

  const create = api.tag.create.useMutation({
    onSuccess: async () => {
      await utils.tag.list.invalidate({ projectId });
      setName("");
    },
  });
  const remove = api.tag.delete.useMutation({
    onSuccess: () => utils.tag.list.invalidate({ projectId }),
  });

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Tags</h3>
      <ul className="flex flex-wrap gap-2">
        {tags.data?.length === 0 && (
          <li className="text-xs text-slate-500">No tags yet</li>
        )}
        {tags.data?.map((t) => (
          <li
            key={t.id}
            className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset"
            style={{ color: t.color, borderColor: t.color }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            {t.name}
            {canManage && (
              <button
                onClick={() => remove.mutate({ id: t.id })}
                className="opacity-0 transition group-hover:opacity-100"
                title="Delete tag"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ projectId, name, color });
        }}
      >
        <input
          className="input flex-1"
          placeholder="frontend"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
        />
        <input
          type="color"
          className="h-9 w-9 cursor-pointer rounded-full border border-slate-300 p-0"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Tag color"
        />
        <button className="btn-primary" disabled={create.isPending}>
          Add
        </button>
      </form>
      )}
      {create.error && (
        <p className="mt-2 text-xs text-red-600">{create.error.message}</p>
      )}
    </div>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}

