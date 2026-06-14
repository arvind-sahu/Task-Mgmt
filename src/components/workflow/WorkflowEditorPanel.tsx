import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";

import { WorkflowVisualizer } from "~/components/workflow/WorkflowVisualizer";
import { api } from "~/utils/api";
import type { ProjectWorkflow } from "~/utils/workflow";
import { sortStatuses } from "~/utils/workflow";

type EditableStatus = {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
  isInitial: boolean;
  isTerminal: boolean;
  legacyStatus: TaskStatus | null;
};

type WorkflowEditorPanelProps = {
  projectId: string;
  canManage: boolean;
};

const STATUS_COLORS = [
  "#64748B",
  "#8B5CF6",
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#EC4899",
];

export function WorkflowEditorPanel({
  projectId,
  canManage,
}: WorkflowEditorPanelProps) {
  const utils = api.useUtils();
  const workflowQuery = api.workflow.byProject.useQuery({ projectId });
  const update = api.workflow.update.useMutation({
    onSuccess: async () => {
      await utils.workflow.byProject.invalidate({ projectId });
      await utils.task.list.invalidate({ projectId });
    },
  });

  const [statuses, setStatuses] = useState<EditableStatus[]>([]);
  const [transitions, setTransitions] = useState<
    ProjectWorkflow["transitions"]
  >([]);
  const [creationLimit, setCreationLimit] = useState(3);
  const [allowAnyNonTerminal, setAllowAnyNonTerminal] = useState(false);
  const [cycleWarning, setCycleWarning] = useState(false);

  useEffect(() => {
    if (!workflowQuery.data) return;
    const wf = workflowQuery.data;
    setStatuses(
      sortStatuses(wf.statuses).map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        orderIndex: s.orderIndex,
        isInitial: s.isInitial,
        isTerminal: s.isTerminal,
        legacyStatus: s.legacyStatus as TaskStatus | null,
      })),
    );
    setTransitions(wf.transitions);
    setCreationLimit(wf.settings.creationLimit);
    setAllowAnyNonTerminal(wf.settings.allowCreationInAnyNonTerminal);
  }, [workflowQuery.data]);

  const sorted = useMemo(() => sortStatuses(statuses), [statuses]);

  if (workflowQuery.isLoading) {
    return <p className="text-sm text-muted">Loading workflow…</p>;
  }

  if (!workflowQuery.data) {
    return <p className="text-sm text-red-600">Failed to load workflow.</p>;
  }

  const wf = workflowQuery.data;
  const planLabel = wf.companyPlan ?? "FREE";
  const editable = canManage && wf.canCustomize;

  function moveStatus(index: number, direction: -1 | 1) {
    const next = [...sorted];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setStatuses(
      next.map((s, orderIndex) => ({ ...s, orderIndex })) as EditableStatus[],
    );
  }

  function addStatus() {
    const id = `new-${Date.now()}`;
    setStatuses((prev) => [
      ...prev,
      {
        id,
        name: "New status",
        color: STATUS_COLORS[prev.length % STATUS_COLORS.length],
        orderIndex: prev.length,
        isInitial: false,
        isTerminal: false,
        legacyStatus: null,
      },
    ]);
  }

  function removeStatus(id: string) {
    setStatuses((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, orderIndex: i })),
    );
    setTransitions((prev) =>
      prev.filter((t) => t.fromStatusId !== id && t.toStatusId !== id),
    );
  }

  function toggleTransition(fromId: string, toId: string) {
    const exists = transitions.some(
      (t) => t.fromStatusId === fromId && t.toStatusId === toId,
    );
    if (exists) {
      setTransitions((prev) =>
        prev.filter((t) => t.fromStatusId !== fromId || t.toStatusId !== toId),
      );
      return;
    }
    setTransitions((prev) => [
      ...prev,
      {
        id: `tmp-${fromId}-${toId}`,
        fromStatusId: fromId,
        toStatusId: toId,
        requiresComment: false,
        requiresAttachment: false,
      },
    ]);
  }

  function toggleTransitionFlag(
    fromId: string,
    toId: string,
    field: "requiresComment" | "requiresAttachment",
  ) {
    setTransitions((prev) =>
      prev.map((t) =>
        t.fromStatusId === fromId && t.toStatusId === toId
          ? { ...t, [field]: !t[field] }
          : t,
      ),
    );
  }

  function detectTerminalCycle() {
    const terminalIds = new Set(
      statuses.filter((s) => s.isTerminal).map((s) => s.id),
    );
    for (const t of transitions) {
      if (terminalIds.has(t.fromStatusId)) {
        setCycleWarning(true);
        return;
      }
    }
    setCycleWarning(false);
  }

  function save() {
    detectTerminalCycle();
    update.mutate({
      projectId,
      statuses,
      transitions: transitions.map((t) => ({
        fromStatusId: t.fromStatusId,
        toStatusId: t.toStatusId,
        requiresComment: t.requiresComment,
        requiresAttachment: t.requiresAttachment,
      })),
      creationLimit,
      allowCreationInAnyNonTerminal: allowAnyNonTerminal,
    });
  }

  if (!wf.canCustomize) {
    return (
      <div className="card mt-4">
        <h3 className="text-sm font-semibold text-heading">Task workflow</h3>
        <p className="mt-1 text-xs text-muted">
          Your plan ({planLabel}) uses the standard workflow. Upgrade to Pro,
          Business, or Enterprise to customize statuses and transitions.
        </p>
        <div className="mt-4">
          <WorkflowVisualizer workflow={wf} />
        </div>
        <Link href="/pricing" className="btn-primary mt-4 inline-block text-xs">
          View plans
        </Link>
      </div>
    );
  }

  if (!editable) {
    return (
      <div className="card mt-4">
        <h3 className="text-sm font-semibold text-heading">Task workflow</h3>
        <p className="mt-1 text-xs text-muted">Read-only view of project workflow.</p>
        <div className="mt-4">
          <WorkflowVisualizer workflow={wf} />
        </div>
      </div>
    );
  }

  return (
    <div className="card mt-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-heading">Workflow editor</h3>
          <p className="text-xs text-muted">
            Plan: <span className="font-semibold">{planLabel}</span>
          </p>
        </div>
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={update.isPending}
          onClick={save}
        >
          {update.isPending ? "Saving…" : "Save workflow"}
        </button>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Statuses
          </h4>
          <button type="button" className="btn-ghost text-xs" onClick={addStatus}>
            + Add status
          </button>
        </div>
        <ul className="space-y-2">
          {sorted.map((status, index) => (
            <li
              key={status.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border p-2"
              style={{ borderColor: "var(--border-muted)" }}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="btn-ghost px-1 text-xs"
                  disabled={index === 0}
                  onClick={() => moveStatus(index, -1)}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-ghost px-1 text-xs"
                  disabled={index === sorted.length - 1}
                  onClick={() => moveStatus(index, 1)}
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>
              <input
                type="color"
                className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
                value={status.color}
                onChange={(e) =>
                  setStatuses((prev) =>
                    prev.map((s) =>
                      s.id === status.id ? { ...s, color: e.target.value } : s,
                    ),
                  )
                }
                aria-label="Status color"
              />
              <input
                className="input min-w-[8rem] flex-1 text-sm"
                value={status.name}
                onChange={(e) =>
                  setStatuses((prev) =>
                    prev.map((s) =>
                      s.id === status.id ? { ...s, name: e.target.value } : s,
                    ),
                  )
                }
              />
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={status.isInitial}
                  onChange={(e) =>
                    setStatuses((prev) =>
                      prev.map((s) =>
                        s.id === status.id
                          ? { ...s, isInitial: e.target.checked }
                          : s,
                      ),
                    )
                  }
                />
                Initial
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={status.isTerminal}
                  onChange={(e) =>
                    setStatuses((prev) =>
                      prev.map((s) =>
                        s.id === status.id
                          ? { ...s, isTerminal: e.target.checked }
                          : s,
                      ),
                    )
                  }
                />
                Terminal
              </label>
              <button
                type="button"
                className="btn-ghost text-xs text-red-600"
                onClick={() => removeStatus(status.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Task creation rule
        </h4>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={!allowAnyNonTerminal}
            onChange={() => setAllowAnyNonTerminal(false)}
          />
          <span>
            Allow creation only in first{" "}
            <select
              className="input mx-1 inline-block w-auto py-0 text-xs"
              value={creationLimit}
              disabled={allowAnyNonTerminal}
              onChange={(e) => setCreationLimit(Number(e.target.value))}
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            statuses (by order)
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowAnyNonTerminal}
            onChange={() => setAllowAnyNonTerminal(true)}
          />
          <span>
            Allow creation in any non-terminal status
            <span className="block text-xs text-amber-600">
              May break team process — use with caution.
            </span>
          </span>
        </label>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Transition rules
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th className="p-1 text-left">From</th>
                {sorted.map((col) => (
                  <th key={col.id} className="p-1 text-center">{col.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((from) => (
                <tr key={from.id}>
                  <td className="p-1 font-medium">{from.name}</td>
                  {sorted.map((to) => {
                    const active = transitions.some(
                      (t) =>
                        t.fromStatusId === from.id && t.toStatusId === to.id,
                    );
                    const rule = transitions.find(
                      (t) =>
                        t.fromStatusId === from.id && t.toStatusId === to.id,
                    );
                    const disabled = from.id === to.id || from.isTerminal;
                    return (
                      <td key={to.id} className="p-1 text-center">
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={active}
                          onChange={() => toggleTransition(from.id, to.id)}
                          aria-label={`${from.name} to ${to.name}`}
                        />
                        {active && rule && (
                          <div className="mt-1 space-y-0.5">
                            <label className="block">
                              <input
                                type="checkbox"
                                checked={rule.requiresComment}
                                onChange={() =>
                                  toggleTransitionFlag(
                                    from.id,
                                    to.id,
                                    "requiresComment",
                                  )
                                }
                              />
                              comment
                            </label>
                            <label className="block">
                              <input
                                type="checkbox"
                                checked={rule.requiresAttachment}
                                onChange={() =>
                                  toggleTransitionFlag(
                                    from.id,
                                    to.id,
                                    "requiresAttachment",
                                  )
                                }
                              />
                              file
                            </label>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {cycleWarning && (
        <p className="text-xs text-amber-600">
          Warning: A terminal status has outgoing transitions (e.g. Done → Todo).
        </p>
      )}
      {update.error && (
        <p className="text-sm text-red-600">{update.error.message}</p>
      )}

      <WorkflowVisualizer
        workflow={{
          ...wf,
          statuses,
          transitions,
          settings: {
            creationLimit,
            allowCreationInAnyNonTerminal: allowAnyNonTerminal,
          },
          creationAllowedStatusIds: allowAnyNonTerminal
            ? statuses.filter((s) => !s.isTerminal).map((s) => s.id)
            : sorted.slice(0, creationLimit).map((s) => s.id),
        }}
      />
    </div>
  );
}
