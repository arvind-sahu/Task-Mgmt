import { useRouter } from "next/router";
import { useState } from "react";
import type { GetServerSidePropsContext } from "next";

import EmptyState from "~/components/EmptyState";
import Layout from "~/components/Layout";
import { ProjectSettingsPanel } from "~/components/ProjectSettingsPanel";
import TaskCard from "~/components/TaskCard";
import { canManageProject } from "~/utils/projectRole";
import TaskForm, { type TaskFormValues } from "~/components/TaskForm";
import { TASK_STATUSES, statusLabel } from "~/components/Badges";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";

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
  const tasks = api.task.list.useQuery({ projectId: id }, { enabled: !!id });

  const [showCreate, setShowCreate] = useState(false);

  const createTask = api.task.create.useMutation({
    onSuccess: async () => {
      await utils.task.list.invalidate({ projectId: id });
      setShowCreate(false);
    },
  });

  const setStatus = api.task.setStatus.useMutation({
    // Optimistic UI: update the cached list immediately, roll back on error.
    onMutate: async ({ id: taskId, status }) => {
      await utils.task.list.cancel({ projectId: id });
      const prev = utils.task.list.getData({ projectId: id });
      utils.task.list.setData({ projectId: id }, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, status } : t)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.task.list.setData({ projectId: id }, ctx.prev);
    },
    onSettled: () => {
      void utils.task.list.invalidate({ projectId: id });
    },
  });

  function handleCreate(values: TaskFormValues) {
    createTask.mutate({
      projectId: id,
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      deadline: values.deadline ? new Date(values.deadline) : null,
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

  return (
    <Layout title={project.data.name}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 h-4 w-4 rounded-sm"
            style={{ backgroundColor: project.data.color }}
          />
          <div>
            <h1 className="text-2xl font-semibold">{project.data.name}</h1>
            {project.data.description && (
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {project.data.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="btn-primary"
        >
          {showCreate ? "Cancel" : "New task"}
        </button>
      </div>

      {showCreate && (
        <div className="card mb-6">
          <h2 className="mb-4 text-lg font-semibold">Create task</h2>
          <TaskForm
            projectId={id}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Kanban */}
        <div className="grid grid-cols-1 gap-4 lg:col-span-3 lg:grid-cols-4">
          {TASK_STATUSES.map((s) => {
            const colTasks =
              tasks.data?.filter((t) => t.status === s) ?? [];
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
                      No tasks
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
                        onStatusChange={(taskId, status) =>
                          setStatus.mutate({ id: taskId, status })
                        }
                        statusUpdating={
                          setStatus.isPending &&
                          setStatus.variables?.id === t.id
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {canManage && (
            <ProjectSettingsPanel
              projectId={id}
              initial={{
                name: project.data.name,
                description: project.data.description,
                color: project.data.color,
              }}
            />
          )}
          <MembersPanel
            projectId={id}
            canManage={canManage}
            pendingInvites={
              canManage && "invites" in project.data ? project.data.invites : []
            }
          />
          <TagsPanel projectId={id} canManage={canManage} />
        </aside>
      </div>
    </Layout>
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

function MembersPanel({
  projectId,
  canManage,
  pendingInvites,
}: {
  projectId: string;
  canManage: boolean;
  pendingInvites: PendingInvite[];
}) {
  const utils = api.useUtils();
  const project = api.project.byId.useQuery({ id: projectId });
  const [email, setEmail] = useState("");

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
    onSuccess: () => utils.project.byId.invalidate({ id: projectId }),
  });
  const cancelInvite = api.project.cancelInvite.useMutation({
    onSuccess: () => utils.project.byId.invalidate({ id: projectId }),
  });

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold">Members</h3>
      <ul className="space-y-2">
        {project.data?.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                {(m.user.name ?? m.user.email).charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-medium text-slate-800">
                  {m.user.name ?? m.user.email}
                </p>
                <p className="text-xs text-slate-500">{m.role}</p>
              </div>
            </div>
            {canManage && m.role !== "OWNER" && (
              <button
                onClick={() =>
                  remove.mutate({ projectId, userId: m.user.id })
                }
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && pendingInvites.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-medium uppercase text-slate-500">
            Pending invites
          </p>
          <ul className="space-y-2">
            {pendingInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between text-xs text-slate-600"
              >
                <span>{inv.email}</span>
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => cancelInvite.mutate({ inviteId: inv.id })}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate({ projectId, email });
          }}
        >
          <input
            className="input"
            type="email"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn-primary w-full" disabled={invite.isPending}>
            {invite.isPending ? "Sending…" : "Invite by email"}
          </button>
          <p className="text-[10px] text-slate-500">
            If they are not registered yet, a pending invite is created.
          </p>
          {invite.error && (
            <p className="text-xs text-red-600">{invite.error.message}</p>
          )}
        </form>
      )}
    </div>
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
    <div className="card">
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

