import { useRouter } from "next/router";
import { SprintPlan, TaskStatus } from "@prisma/client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { GetServerSidePropsContext } from "next";

import EmptyState from "~/components/EmptyState";
import { AssigneePicker } from "~/components/AssigneePicker";
import Layout from "~/components/Layout";
import { SprintChangeControl } from "~/components/SprintChangeControl";
import { projectTabsForId } from "~/config/appNav";
import { CachedAvatar } from "~/components/CachedAvatar";
import { ProjectSettingsPanel } from "~/components/ProjectSettingsPanel";
import {
  RichTextContent,
  RichTextEditor,
} from "~/components/rich-text";
import {
  useRichTextImageUpload,
} from "~/components/rich-text/useRichTextImageUpload";
import TaskCard from "~/components/TaskCard";
import { TaskCommentsSection } from "~/components/TaskCommentsSection";
import { isTaskCompleted, TaskCompletedTick } from "~/components/TaskIndicators";
import { TagChip } from "~/components/TagChip";
import { canManageProject } from "~/utils/projectRole";
import TaskForm, { type TaskFormValues } from "~/components/TaskForm";
import { TASK_STATUSES, statusLabel } from "~/components/Badges";
import { requireAuth } from "~/server/auth";
import { api, type RouterOutputs } from "~/utils/api";
import { initialsFromName } from "~/utils/avatar";
import {
  dateInputValue,
  formatSprintEndPreview,
  sprintPlanLabel,
} from "~/utils/sprint";
import { readSprintPanelOpen, writeSprintPanelOpen } from "~/utils/panelPrefs";

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
  const showSettingsView = router.query.view === "settings";

  const utils = api.useUtils();
  const project = api.project.byId.useQuery({ id }, { enabled: !!id });
  const [showSprintPanel, setShowSprintPanel] = useState(false);
  const currentSprint = api.sprint.current.useQuery(
    { projectId: id },
    { enabled: !!id, staleTime: 60_000 },
  );
  const sprints = api.sprint.list.useQuery(
    { projectId: id },
    { enabled: !!id && showSprintPanel, staleTime: 60_000 },
  );

  useEffect(() => {
    setShowSprintPanel(readSprintPanelOpen());
  }, []);

  function toggleSprintPanel() {
    setShowSprintPanel((open) => {
      const next = !open;
      writeSprintPanelOpen(next);
      return next;
    });
  }

  const [showCreate, setShowCreate] = useState(false);
  const [activeSprintId, setActiveSprintId] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const [boardOverflowsX, setBoardOverflowsX] = useState(false);

  const resolvedSprintId =
    activeSprintId || currentSprint.data?.id || null;
  const taskListInput = useMemo(
    () => ({
      projectId: id,
      sprintId: resolvedSprintId,
    }),
    [id, resolvedSprintId],
  );
  const tasksReady =
    currentSprint.isFetched &&
    (currentSprint.data == null || resolvedSprintId != null);

  const tasks = api.task.list.useQuery(taskListInput, {
    enabled: !!id && tasksReady,
    staleTime: 30_000,
  });
  const selectedTask = api.task.byId.useQuery(
    { id: selectedTaskId ?? "" },
    { enabled: !!selectedTaskId },
  );
  const sprintBrief = api.sprint.listBrief.useQuery(
    { projectId: id },
    { enabled: !!id && (showCreate || !!selectedTaskId) },
  );
  const sprintOptions = (sprintBrief.data ?? []).map((sprint) => ({
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  }));

  useEffect(() => {
    if (activeSprintId || !currentSprint.data) return;
    setActiveSprintId(currentSprint.data.id);
  }, [activeSprintId, currentSprint.data]);

  useEffect(() => {
    setTaskSearch("");
    setSelectedTaskId(null);
  }, [activeSprintId]);

  useEffect(() => {
    setSelectedTaskId(null);
  }, [taskSearch, selectedMemberIds]);

  useEffect(() => {
    if (!id || router.query.view !== "settings" || project.isLoading || !project.data) {
      return;
    }
    if (!canManageProject(project.data.currentUserRole)) {
      void router.replace(`/projects/${id}`, undefined, { shallow: true });
    }
  }, [id, project.data, project.isLoading, router]);

  const invalidateSprints = () => {
    void utils.sprint.current.invalidate({ projectId: id });
    void utils.sprint.listBrief.invalidate({ projectId: id });
    if (showSprintPanel) {
      void utils.sprint.list.invalidate({ projectId: id });
    }
  };

  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      void utils.task.list.invalidate({ projectId: id });
      void utils.sprint.backlog.invalidate({ projectId: id });
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
  const [createModalCloseSignal, setCreateModalCloseSignal] = useState(0);
  const createSprint = api.sprint.create.useMutation({
    onSuccess: async (sprint) => {
      setActiveSprintId(sprint.id);
      invalidateSprints();
      createSprint.reset();
      setCreateModalCloseSignal((value) => value + 1);
    },
  });
  const updateSprint = api.sprint.update.useMutation({
    onSuccess: async () => {
      invalidateSprints();
    },
  });
  const deleteSprint = api.sprint.delete.useMutation({
    onSuccess: async (_result, variables) => {
      const deletedId =
        variables && typeof variables === "object" ? variables.id : undefined;
      if (deletedId && activeSprintId === deletedId) {
        setActiveSprintId("");
      }
      invalidateSprints();
    },
  });
  const cleanupInvalidSprints = api.sprint.cleanupInvalid.useMutation({
    onSuccess: async (result) => {
      invalidateSprints();
      if (result.deletedCount > 0) {
        alert(`Removed ${result.deletedCount} inconsistent sprint(s).`);
      } else {
        alert("All sprints already follow the project plan.");
      }
    },
  });
  const activeSprint =
    sprints.data?.find((s) => s.id === activeSprintId) ??
    (currentSprint.data?.id === activeSprintId ? currentSprint.data : null);
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

  function handleBoardWheel(event: React.WheelEvent<HTMLDivElement>) {
    const board = boardScrollRef.current;
    if (!board || board.scrollWidth <= board.clientWidth + 1) return;

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0;
    if (delta === 0) return;

    const maxScroll = board.scrollWidth - board.clientWidth;
    const next = board.scrollLeft + delta;
    if (next < 0 || next > maxScroll) return;

    event.preventDefault();
    board.scrollLeft = next;
    syncBoardScroll("board");
  }

  useLayoutEffect(() => {
    const board = boardScrollRef.current;
    if (!board || selectedTaskId) {
      setBoardOverflowsX(false);
      return;
    }

    const measure = () => {
      setBoardOverflowsX(board.scrollWidth > board.clientWidth + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    return () => observer.disconnect();
  }, [
    filteredTasks.length,
    selectedTaskId,
    showCreate,
    showSprintPanel,
    taskSearch,
  ]);

  useLayoutEffect(() => {
    const board = boardScrollRef.current;
    const top = topScrollRef.current;
    if (!board || !top || !boardOverflowsX) return;
    const track = top.querySelector(".task-board-track");
    if (track instanceof HTMLElement) {
      track.style.width = `${board.scrollWidth}px`;
    }
  }, [boardOverflowsX, filteredTasks.length, showSprintPanel, taskSearch]);

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
  const projectTabs = canManage
    ? projectTabsForId(id)
    : projectTabsForId(id).filter((tab) => tab.key !== "settings");
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
      projectColor={project.data.color}
      projectTabs={projectTabs}
      projectTaskSearch={
        showSettingsView
          ? undefined
          : {
              value: taskSearch,
              onChange: setTaskSearch,
              filteredCount: filteredTasks.length,
              totalCount: sprintTasks.length,
            }
      }
      contentClassName="app-main mx-auto flex h-full min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-hidden px-2 py-2 sm:px-3 lg:px-4"
    >
      {showCreate && !showSettingsView && (
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
            sprintOptions={sprintOptions}
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

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-3 ${
          showSprintPanel
            ? "xl:grid-cols-[14rem_minmax(0,1fr)_12.8rem] 2xl:grid-cols-[15rem_minmax(0,1fr)_13.6rem]"
            : "xl:grid-cols-[minmax(0,1fr)_12.8rem] 2xl:grid-cols-[minmax(0,1fr)_13.6rem]"
        }`}
      >
        {showSprintPanel && !showSettingsView ? (
          <aside className="space-y-4">
            <SprintSidebar
              canManage={canManage}
              sprintPlan={project.data.sprintPlan}
              sprintStartDayOfWeek={project.data.sprintStartDayOfWeek}
              durationWeeks={project.data.sprintDurationWeeks}
              sprints={sprints.data ?? []}
              sprintsLoading={sprints.isLoading}
              activeSprintId={activeSprintId}
              activeSprint={activeSprint}
              onSelectSprint={setActiveSprintId}
              onCreateSprint={(input) =>
                createSprint.mutate({ projectId: id, ...input })
              }
              onUpdateSprint={(input) => updateSprint.mutate(input)}
              onDeleteSprint={(sprintId) => deleteSprint.mutate({ id: sprintId })}
              onCleanupInvalid={() =>
                cleanupInvalidSprints.mutate({ projectId: id })
              }
              creatingSprint={createSprint.isPending}
              deletingSprintId={
                deleteSprint.variables &&
                typeof deleteSprint.variables === "object"
                  ? deleteSprint.variables.id
                  : undefined
              }
              cleaningUp={cleanupInvalidSprints.isPending}
              updatingSprintId={
                updateSprint.variables && typeof updateSprint.variables === "object"
                  ? updateSprint.variables.id
                  : undefined
              }
              createSprintError={createSprint.error?.message}
              updateSprintError={updateSprint.error?.message}
              createCloseSignal={createModalCloseSignal}
            />
          </aside>
        ) : null}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {showSettingsView && canManage ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ProjectSettingsPanel
                projectId={id}
                initial={{
                  name: project.data.name,
                  description: project.data.description,
                  color: project.data.color,
                  sprintPlan: project.data.sprintPlan,
                  sprintStartDayOfWeek: project.data.sprintStartDayOfWeek,
                  sprintDurationWeeks: project.data.sprintDurationWeeks,
                }}
              >
                <TagsPanel projectId={id} canManage={canManage} />
              </ProjectSettingsPanel>
            </div>
          ) : (
            <>
          <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSprintPanel}
              className="btn-ghost shrink-0 px-2 py-1.5 text-xs"
              aria-expanded={showSprintPanel}
              aria-label={showSprintPanel ? "Hide sprint panel" : "Show sprint panel"}
            >
              {showSprintPanel ? "◀ Hide sprints" : "▶ Sprints"}
            </button>
            {selectedMemberLabels.length > 0 && (
              <p className="min-w-0 text-xs text-muted">
                Assigned to{" "}
                <span className="font-semibold text-heading">
                  {selectedMemberLabels.join(", ")}
                </span>
              </p>
            )}
            {sprintOptions.length > 0 && (
              <SprintChangeControl
                value={resolvedSprintId}
                sprints={sprintOptions}
                onChange={(sprintId) => setActiveSprintId(sprintId ?? "")}
              />
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreate((s) => !s)}
                className={`h-9 shrink-0 rounded-lg border px-3 text-xs font-medium transition ${
                  showCreate ? "chip-active" : "chip interactive-hover"
                }`}
              >
                {showCreate ? "Cancel" : "New task"}
              </button>
            </div>
          </div>
          {selectedTaskId ? (
            <div className="task-detail-shell min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <TaskDetailPanel
                task={selectedTask.data}
                loading={selectedTask.isLoading}
                error={selectedTask.error?.message}
                sprintOptions={sprintOptions}
                submitting={updateTask.isPending}
                updateError={updateTask.error?.message}
                onBack={() => setSelectedTaskId(null)}
                onSubmit={handleTaskEdit}
              />
            </div>
          ) : (
            <div className="task-board-shell flex min-h-0 flex-1 flex-col">
              {boardOverflowsX && (
                <div
                  ref={topScrollRef}
                  className="mb-2 h-4 shrink-0 overflow-x-auto overflow-y-hidden task-board-scroll-top"
                  onScroll={() => syncBoardScroll("top")}
                  aria-label="Task board horizontal scroll"
                >
                  <div className="task-board-track h-1" />
                </div>
              )}
              <div
                ref={boardScrollRef}
                className="task-board-scroll min-h-0 w-full min-w-0 flex-1 pb-2"
                onScroll={() => syncBoardScroll("board")}
                onWheel={handleBoardWheel}
              >
                {taskSearch.trim() && filteredTasks.length === 0 && (
                  <div className="mb-3 rounded-2xl border border-dashed p-5 text-center text-sm text-muted" style={{ borderColor: "var(--border)" }}>
                    <p className="font-semibold">
                      ✨ No tasks match &quot;{taskSearch.trim()}&quot;.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try different keywords.
                    </p>
                  </div>
                )}
                <div className="task-board-grid grid h-full min-w-[86rem] grid-cols-5 gap-3">
                {TASK_STATUSES.map((s) => {
                  const colTasks = filteredTasks.filter((t) => t.status === s);
                  return (
                    <div
                      key={s}
                      className="task-column flex min-h-0 flex-col rounded-xl p-3"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const taskId = e.dataTransfer.getData("text/plain");
                        if (taskId) setStatus.mutate({ id: taskId, status: s });
                      }}
                    >
                      <div className="mb-3 flex shrink-0 items-center justify-between px-1">
                        <h3 className="text-sm font-semibold text-heading">
                          {statusLabel[s]}
                        </h3>
                        <span className="chip rounded-full px-2 py-0.5 text-xs">
                          {colTasks.length}
                        </span>
                      </div>
                      <div className="task-column-body min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden">
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
            </div>
          )}
            </>
          )}
        </section>

        <aside className="space-y-3">
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
        </aside>
      </div>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Sprint planning
// ---------------------------------------------------------------------------

type SprintListItem = RouterOutputs["sprint"]["list"][number];
type SprintCurrentItem = RouterOutputs["sprint"]["current"];
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
  const { uploadImage } = useRichTextImageUpload();

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

  const assigneeMembers = project.data?.members.map((member) => member.user) ?? [];

  return (
    <>
      <div className="card">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex min-w-0 items-start gap-3 lg:max-w-sm lg:flex-1 xl:max-w-md">
          <button
            type="button"
            className="btn-ghost grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-semibold shadow-sm"
            onClick={onBack}
            aria-label="Back to task board"
          >
            ←
          </button>
          {titleEditing ? (
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {isTaskCompleted(status) && <TaskCompletedTick className="mt-1.5" />}
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
              {isTaskCompleted(status) && <TaskCompletedTick className="mt-1.5 shrink-0" />}
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
      <TaskCommentsSection
        taskId={task.id}
        comments={task.comments}
        isProjectOwner={project.data?.currentUserRole === "OWNER"}
      />
    </>
  );
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
  sprint: SprintListItem | SprintCurrentItem,
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
  { label: string; cardClass: string; badgeClass: string; accent: string }
> = {
  current: {
    label: "Current",
    cardClass: "sprint-card--current",
    badgeClass: "badge-phase-current",
    accent: "bg-emerald-500",
  },
  past: {
    label: "Past",
    cardClass: "sprint-card--past",
    badgeClass: "badge-phase-past",
    accent: "bg-slate-400",
  },
  upcoming: {
    label: "Upcoming",
    cardClass: "sprint-card--upcoming",
    badgeClass: "badge-phase-upcoming",
    accent: "bg-sky-400",
  },
};

function sprintCardClassName(phase: SprintPhase, isActive: boolean) {
  const meta = sprintPhaseMeta[phase];
  return [
    "sprint-card",
    meta.cardClass,
    isActive ? "sprint-card--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function sprintAnalysis(sprint: SprintListItem | SprintCurrentItem) {
  const breakdown = sprint.statusBreakdown;
  const total = sprint._count.tasks;
  const completed = breakdown?.DONE ?? 0;
  const todo = breakdown?.TODO ?? 0;
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
  sprintPlan,
  sprintStartDayOfWeek,
  durationWeeks,
  sprints,
  sprintsLoading,
  activeSprintId,
  activeSprint,
  onSelectSprint,
  onCreateSprint,
  onUpdateSprint,
  onDeleteSprint,
  onCleanupInvalid,
  creatingSprint,
  deletingSprintId,
  cleaningUp,
  updatingSprintId,
  createSprintError,
  updateSprintError,
  createCloseSignal,
}: {
  canManage: boolean;
  sprintPlan: SprintPlan;
  sprintStartDayOfWeek: number | null;
  durationWeeks: number;
  sprints: SprintListItem[];
  sprintsLoading?: boolean;
  activeSprintId: string;
  activeSprint: SprintListItem | SprintCurrentItem | null;
  onSelectSprint: (id: string) => void;
  onCreateSprint: (input: { name?: string; startDate: Date }) => void;
  onUpdateSprint: (input: { id: string; name?: string; startDate?: Date }) => void;
  onDeleteSprint: (sprintId: string) => void;
  onCleanupInvalid: () => void;
  creatingSprint: boolean;
  deletingSprintId?: string;
  cleaningUp: boolean;
  updatingSprintId?: string;
  createSprintError?: string;
  updateSprintError?: string;
  createCloseSignal?: number;
}) {
  const today = dateInputValue(new Date());
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuSprintId, setMenuSprintId] = useState<string | null>(null);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const suppressSprintNameBlurRef = useRef(false);
  const lastHandledCloseSignalRef = useRef(createCloseSignal ?? 0);
  const planLabel = sprintPlanLabel(sprintPlan, durationWeeks, sprintStartDayOfWeek);
  const previewEndDate = formatSprintEndPreview(startDate, durationWeeks);
  const editPreviewEndDate = formatSprintEndPreview(editStartDate, durationWeeks);

  useEffect(() => {
    if (
      createCloseSignal == null ||
      createCloseSignal === lastHandledCloseSignalRef.current
    ) {
      return;
    }
    lastHandledCloseSignalRef.current = createCloseSignal;
    setShowCreateModal(false);
    setName("");
  }, [createCloseSignal]);

  function closeCreateModal() {
    setShowCreateModal(false);
    setName("");
  }

  return (
    <section className="card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-muted-text)]">
            Sprints
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-heading">
            {activeSprint ? activeSprint.name : "Select sprint"}
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">{planLabel}</p>
        </div>
        {canManage && (
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              className="btn-primary px-3 py-1.5 text-xs"
              onClick={() => setShowCreateModal(true)}
            >
              Create sprint
            </button>
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-[10px]"
              disabled={cleaningUp}
              onClick={onCleanupInvalid}
            >
              {cleaningUp ? "Cleaning…" : "Fix invalid sprints"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 max-h-[calc(100vh-18rem)] space-y-2 overflow-y-auto pr-1">
        {sprintsLoading && sprints.length === 0 && (
          <p className="rounded-2xl border border-dashed p-4 text-sm text-muted" style={{ borderColor: "var(--border)" }}>
            Loading sprints…
          </p>
        )}
        {!sprintsLoading && sprints.length === 0 && (
          <p className="rounded-2xl border border-dashed p-4 text-sm text-muted" style={{ borderColor: "var(--border)" }}>
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
                    className="input text-sm font-semibold"
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
                      className="app-nav-link min-w-0 flex-1 truncate rounded-md px-1 py-0.5 text-left text-sm font-semibold text-heading"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (canManage) {
                          setEditingSprintId(sprint.id);
                          setEditName(sprint.name);
                          setEditStartDate(dateInputValue(new Date(sprint.startDate)));
                        } else {
                          onSelectSprint(sprint.id);
                        }
                      }}
                      title={sprint.name}
                    >
                      {sprint.name}
                    </button>
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ${phaseMeta.badgeClass}`}
                    >
                      {phaseMeta.label}
                    </span>
                  </div>
                )}
                <p className="mt-1 text-xs text-muted">
                  {formatSprintRange(sprint.startDate, sprint.endDate)}
                </p>
                <p className="mt-1 text-xs font-medium text-muted">
                  {analysis.total} tasks
                </p>
              </div>
              {canManage && (
                <div className="absolute right-2 top-2">
                  <button
                    type="button"
                    className="app-nav-link rounded-full px-2 py-0.5 text-lg leading-none"
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
                    <div className="app-dropdown absolute right-0 z-20 mt-1 w-36 rounded-lg p-1 shadow-lg">
                      <button
                        type="button"
                        className="app-dropdown-item w-full rounded-md px-2 py-1.5 text-left text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingSprintId(sprint.id);
                          setEditName(sprint.name);
                          setEditStartDate(dateInputValue(new Date(sprint.startDate)));
                          setMenuSprintId(null);
                        }}
                      >
                        Edit sprint
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-[var(--danger-hover-bg)]"
                        style={{ color: "var(--danger-text)" }}
                        disabled={deletingSprintId === sprint.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (
                            confirm(
                              `Delete "${sprint.name}"? Tasks in this sprint move to backlog.`,
                            )
                          ) {
                            onDeleteSprint(sprint.id);
                          }
                          setMenuSprintId(null);
                        }}
                      >
                        {deletingSprintId === sprint.id ? "Deleting…" : "Delete sprint"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {isEditing && (
                <form
                  className="mt-3 space-y-2 border-t pt-3"
                  style={{ borderColor: "var(--border)" }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    onUpdateSprint({
                      id: sprint.id,
                      name: editName,
                      startDate: new Date(editStartDate),
                    });
                    setEditingSprintId(null);
                  }}
                >
                  <input
                    className="input"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    required
                  />
                  <div>
                    <label className="label">Start date</label>
                    <input
                      type="date"
                      className="input mt-1"
                      value={editStartDate}
                      onChange={(event) => setEditStartDate(event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">End date (auto)</label>
                    <input
                      type="date"
                      className="input mt-1 opacity-80"
                      value={editPreviewEndDate}
                      readOnly
                      disabled
                    />
                  </div>
                  {sprintPlan === SprintPlan.CUSTOM_DAY && sprintStartDayOfWeek != null && (
                    <p className="text-[10px] text-muted">
                      Must start on{" "}
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][sprintStartDayOfWeek]}
                    </p>
                  )}
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
                    <p className="text-xs" style={{ color: "var(--danger-text)" }}>
                      {updateSprintError}
                    </p>
                  )}
                </form>
              )}
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div className="modal-overlay fixed inset-0 z-[80] grid place-items-center p-4">
          <form
            className="modal-panel w-full max-w-md rounded-2xl p-5 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateSprint({
                name: name || undefined,
                startDate: new Date(startDate),
              });
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-heading">Create sprint</h3>
                <p className="mt-1 text-xs text-muted">
                  {planLabel}. Sprints must be continuous with no gaps or overlaps.
                </p>
              </div>
              <button
                type="button"
                className="app-nav-link rounded-full px-2 py-1"
                onClick={closeCreateModal}
                aria-label="Close create sprint modal"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Sprint name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <div>
                <label className="label">Start date</label>
                <input
                  type="date"
                  className="input mt-1"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">End date (auto)</label>
                <input
                  type="date"
                  className="input mt-1 opacity-80"
                  value={previewEndDate}
                  readOnly
                  disabled
                />
              </div>
              {sprintPlan === SprintPlan.CUSTOM_DAY && sprintStartDayOfWeek != null && (
                <p className="text-xs text-muted">
                  Start day must be{" "}
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][sprintStartDayOfWeek]}
                </p>
              )}
              <button className="btn-primary w-full" disabled={creatingSprint}>
                {creatingSprint ? "Creating..." : "Create sprint"}
              </button>
              {createSprintError && (
                <p className="text-xs" style={{ color: "var(--danger-text)" }}>
                  {createSprintError}
                </p>
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
      <h3 className="mb-2 text-sm font-semibold text-heading">Members</h3>
      <label className="sr-only" htmlFor="project-member-search">
        Search project members
      </label>
      <div className="relative mb-2">
        {hasMemberFilter && (
          <span
            className="link-accent pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <FilterIcon />
          </span>
        )}
        <input
          id="project-member-search"
          className={`input h-9 w-full text-xs ${hasMemberFilter ? "pl-8 pr-14" : ""}`}
          placeholder="Search members..."
          value={memberSearch}
          onChange={(event) => onMemberSearch(event.target.value)}
        />
        {hasMemberFilter && (
          <button
            type="button"
            className="link-accent absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold hover:underline"
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
                  ? "chip-active"
                  : "border-transparent interactive-hover"
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
                  <span className="block truncate text-xs font-semibold text-heading">
                    {label}
                  </span>
                  <span className="block text-[10px] uppercase text-muted">
                    {member.role}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="app-nav-link grid h-7 w-7 shrink-0 place-items-center rounded-md"
                onClick={() => onToggleMenu(member.user.id)}
                aria-label={`Open actions for ${label}`}
                aria-expanded={openMenuMemberId === member.user.id}
              >
                ...
              </button>
              {openMenuMemberId === member.user.id && (
                <div className="app-dropdown absolute right-0 top-9 z-40 w-44 rounded-xl p-1 shadow-xl">
                  <button
                    type="button"
                    className="app-dropdown-item block w-full rounded-lg px-3 py-2 text-left text-sm"
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
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--danger-hover-bg)]"
                      style={{ color: "var(--danger-text)" }}
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
          <li className="surface-muted rounded-lg px-3 py-2 text-xs text-muted">
            No members match this search.
          </li>
        )}
      </ul>

      {canManage && (
        <div
          className="mt-3 space-y-2 border-t pt-3"
          style={{ borderColor: "var(--border-muted)" }}
        >
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
              <p className="text-[10px] font-semibold uppercase text-muted">
                Pending
              </p>
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="app-banner-warning flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[11px]"
                >
                  <span className="truncate">{inv.email}</span>
                  <button
                    type="button"
                    className="shrink-0 font-bold hover:underline"
                    style={{ color: "var(--danger-text)" }}
                    onClick={() => cancelInvite.mutate({ inviteId: inv.id })}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
          {invite.error && (
            <p className="text-xs" style={{ color: "var(--danger-text)" }}>
              {invite.error.message}
            </p>
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
    <span className="app-avatar grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full text-[10px] font-bold ring-2 ring-[var(--surface)]">
      <CachedAvatar
        user={member.user}
        alt={label}
        className="h-full w-full object-cover"
        fallback={initials}
      />
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
      <h3 className="mb-3 text-sm font-semibold text-heading">Tags</h3>
      <ul className="flex flex-wrap gap-2">
        {tags.data?.length === 0 && (
          <li className="text-xs text-muted">No tags yet</li>
        )}
        {tags.data?.map((t) => (
          <li key={t.id} className="group inline-flex items-center gap-1">
            <TagChip name={t.name} color={t.color} size="md" />
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

