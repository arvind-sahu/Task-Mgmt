import { SprintPlan } from "@prisma/client";
import { useRef, useState, type ReactNode } from "react";

import { SPRINT_DAY_LABELS } from "~/utils/sprint";
import { api } from "~/utils/api";

type ProjectSettingsPanelProps = {
  projectId: string;
  children?: ReactNode;
  initial: {
    name: string;
    description: string | null;
    color: string;
    sprintPlan: SprintPlan;
    sprintStartDayOfWeek: number | null;
    sprintDurationWeeks: number;
  };
};

export function ProjectSettingsPanel({
  projectId,
  children,
  initial,
}: ProjectSettingsPanelProps) {
  const utils = api.useUtils();
  const [name, setName] = useState(initial.name);
  const [draftName, setDraftName] = useState(initial.name);
  const [editingName, setEditingName] = useState(false);
  const suppressNameBlurRef = useRef(false);
  const [description, setDescription] = useState(initial.description ?? "");
  const [color, setColor] = useState(initial.color);
  const [sprintPlan, setSprintPlan] = useState<SprintPlan>(initial.sprintPlan);
  const [sprintStartDayOfWeek, setSprintStartDayOfWeek] = useState<number>(
    initial.sprintStartDayOfWeek ?? 1,
  );

  const update = api.project.update.useMutation({
    onSuccess: async () => {
      await utils.project.byId.invalidate({ id: projectId });
      await utils.project.list.invalidate();
    },
  });

  function saveName() {
    const nextName = draftName.trim();
    setEditingName(false);
    if (!nextName || nextName === name) {
      setDraftName(name);
      return;
    }
    setName(nextName);
    update.mutate({ id: projectId, name: nextName });
  }

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold text-heading">Project settings</h3>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({
            id: projectId,
            description: description || undefined,
            color,
            sprintPlan,
            sprintStartDayOfWeek:
              sprintPlan === SprintPlan.CUSTOM_DAY ? sprintStartDayOfWeek : null,
          });
        }}
      >
        <div className="surface-muted rounded-xl p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Project name
          </p>
          {editingName ? (
            <input
              className="input mt-1 text-sm font-semibold"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={() => {
                if (suppressNameBlurRef.current) {
                  suppressNameBlurRef.current = false;
                  return;
                }
                saveName();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveName();
                if (event.key === "Escape") {
                  suppressNameBlurRef.current = true;
                  setDraftName(name);
                  setEditingName(false);
                }
              }}
              autoFocus
              maxLength={120}
            />
          ) : (
            <button
              type="button"
              className="app-nav-link mt-1 w-full rounded-lg px-2 py-1 text-left text-sm font-semibold text-heading"
              onClick={() => setEditingName(true)}
            >
              {name}
            </button>
          )}
        </div>
        <div>
          <label className="label" htmlFor="proj-desc">
            Description
          </label>
          <textarea
            id="proj-desc"
            className="input mt-1"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="proj-sprint-plan">
            Sprint plan
          </label>
          <select
            id="proj-sprint-plan"
            className="input mt-1"
            value={sprintPlan}
            onChange={(e) => setSprintPlan(e.target.value as SprintPlan)}
          >
            <option value={SprintPlan.WEEKLY}>Weekly (7 days)</option>
            <option value={SprintPlan.BIWEEKLY}>Bi-weekly (14 days)</option>
            <option value={SprintPlan.CUSTOM_DAY}>Fixed start day (weekly)</option>
          </select>
          <p className="mt-1 text-xs text-muted">
            New sprints follow this plan. End dates are calculated automatically.
          </p>
        </div>
        {sprintPlan === SprintPlan.CUSTOM_DAY && (
          <div>
            <label className="label" htmlFor="proj-sprint-day">
              Sprint starts on
            </label>
            <select
              id="proj-sprint-day"
              className="input mt-1"
              value={sprintStartDayOfWeek}
              onChange={(e) => setSprintStartDayOfWeek(Number(e.target.value))}
            >
              {SPRINT_DAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="proj-color">
            Color
          </label>
          <input
            id="proj-color"
            type="color"
            className="input mt-1 h-9 w-full cursor-pointer"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={update.isPending}
        >
          {update.isPending ? "Saving…" : "Save settings"}
        </button>
        {update.error && (
          <p className="text-xs" style={{ color: "var(--danger-text)" }}>
            {update.error.message}
          </p>
        )}
        {update.isSuccess && (
          <p className="text-xs text-emerald-600">Settings saved.</p>
        )}
      </form>
      {children && (
        <div
          className="mt-5 border-t pt-5"
          style={{ borderColor: "var(--border-muted)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
