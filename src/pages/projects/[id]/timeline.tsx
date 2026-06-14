import { useRouter } from "next/router";
import Link from "next/link";
import type { GetServerSidePropsContext } from "next";
import { useMemo, useState } from "react";

import Layout from "~/components/Layout";
import { CachedAvatar } from "~/components/CachedAvatar";
import { projectTabsForId } from "~/config/appNav";
import { canManageProject } from "~/utils/projectRole";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import { initialsFromName } from "~/utils/avatar";
import { formatLogDate, hoursFromDecimal } from "~/utils/timeLog";

export default function ProjectTimelinePage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  const project = api.project.byId.useQuery({ id }, { enabled: !!id });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userId, setUserId] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [applied, setApplied] = useState({
    from: "",
    to: "",
    userId: "",
    taskSearch: "",
  });

  const canManage =
    project.data && canManageProject(project.data.currentUserRole);

  const timeline = api.timeLog.listByProject.useQuery(
    {
      projectId: id,
      userId: applied.userId || undefined,
      taskSearch: applied.taskSearch || undefined,
      from: applied.from ? new Date(applied.from) : undefined,
      to: applied.to ? new Date(applied.to) : undefined,
    },
    { enabled: !!id && !!canManage },
  );

  const memberOptions = useMemo(() => {
    if (!project.data) return [];
    const members = [
      project.data.owner,
      ...project.data.members.map((m) => m.user).filter(Boolean),
    ];
    const seen = new Set<string>();
    return members.filter((u) => {
      if (!u || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [project.data]);

  if (project.isLoading) {
    return (
      <Layout title="Timeline">
        <p className="text-sm text-muted">Loading…</p>
      </Layout>
    );
  }

  if (project.error || !project.data) {
    return (
      <Layout title="Timeline">
        <p className="text-sm text-red-600">Project not found.</p>
      </Layout>
    );
  }

  if (!canManage) {
    return (
      <Layout
        title={project.data.name}
        headerTitle={project.data.name}
        projectColor={project.data.color}
        projectTabs={projectTabsForId(id).filter((t) => t.key !== "settings")}
      >
        <div className="card p-6 text-center">
          <p className="text-sm text-muted">
            Only project admins can view the team timeline.
          </p>
          <Link href={`/projects/${id}`} className="btn-primary mt-4 inline-block text-sm">
            Back to board
          </Link>
        </div>
      </Layout>
    );
  }

  const projectTabs = projectTabsForId(id);

  return (
    <Layout
      title={`${project.data.name} · Timeline`}
      headerTitle={project.data.name}
      projectColor={project.data.color}
      projectTabs={projectTabs}
      contentClassName="app-main mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden px-2 py-2 sm:px-3 lg:px-4"
    >
      <div className="mb-4 shrink-0">
        <h1 className="text-lg font-semibold text-heading">Time timeline</h1>
        <p className="text-sm text-muted">
          All logged hours across this project
        </p>
      </div>

      <form
        className="card mb-4 shrink-0 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ from, to, userId, taskSearch });
        }}
      >
        <div>
          <label className="label">From</label>
          <input type="date" className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">User</label>
          <select className="input mt-1" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All users</option>
            {memberOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Task</label>
          <input
            className="input mt-1"
            placeholder="Search tasks…"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full text-sm">Apply filters</button>
        </div>
      </form>

      {timeline.data && (
        <div className="mb-4 flex flex-wrap gap-4 shrink-0 text-sm">
          <span className="chip rounded-lg px-3 py-1">
            Total: <strong>{timeline.data.totalHours.toFixed(2)}h</strong>
          </span>
          {timeline.data.perUser.map((row) => (
            <span key={row.userId} className="chip rounded-lg px-3 py-1">
              {row.name}: <strong>{row.hours.toFixed(2)}h</strong>
            </span>
          ))}
        </div>
      )}

      <div className="card min-h-0 flex-1 overflow-y-auto">
        {timeline.isLoading ? (
          <p className="p-4 text-sm text-muted">Loading entries…</p>
        ) : timeline.error ? (
          <p className="p-4 text-sm text-red-600">{timeline.error.message}</p>
        ) : timeline.data?.logs.length === 0 ? (
          <p className="p-4 text-sm text-muted">No time entries match your filters.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b text-xs uppercase text-muted" style={{ borderColor: "var(--border-muted)", background: "var(--surface-elevated)" }}>
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">User</th>
                <th className="p-3">Task</th>
                <th className="p-3">Hours</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {timeline.data.logs.map((log) => (
                <tr key={log.id} className="border-b" style={{ borderColor: "var(--border-muted)" }}>
                  <td className="p-3 whitespace-nowrap">{formatLogDate(log.logDate)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="app-avatar grid h-7 w-7 place-items-center overflow-hidden rounded-full text-[10px] font-semibold">
                        <CachedAvatar
                          user={log.user}
                          alt={log.user.name ?? log.user.email ?? ""}
                          className="h-full w-full object-cover"
                          fallback={initialsFromName(log.user.name, log.user.email)}
                        />
                      </div>
                      <span>{log.user.name ?? log.user.email}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Link href={`/tasks/${log.task.id}`} className="link-accent hover:underline">
                      {log.task.title}
                    </Link>
                  </td>
                  <td className="p-3 font-medium">{hoursFromDecimal(log.hours).toFixed(2)}h</td>
                  <td className="p-3 text-muted">{log.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}
