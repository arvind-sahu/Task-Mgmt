import { useRef, useState, type ReactNode } from "react";

import { api } from "~/utils/api";

type ProjectSettingsPanelProps = {
  projectId: string;
  children?: ReactNode;
  initial: {
    name: string;
    description: string | null;
    color: string;
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
  const [sprintDurationWeeks, setSprintDurationWeeks] = useState<1 | 2>(
    initial.sprintDurationWeeks === 2 ? 2 : 1,
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
      <h3 className="mb-3 text-sm font-semibold">Project settings</h3>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({
            id: projectId,
            description: description || undefined,
            color,
            sprintDurationWeeks,
          });
        }}
      >
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project name
          </p>
          {editingName ? (
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
              className="mt-1 w-full rounded-lg px-2 py-1 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
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
          <label className="label" htmlFor="proj-sprint-duration">
            Sprint plan
          </label>
          <select
            id="proj-sprint-duration"
            className="input mt-1"
            value={sprintDurationWeeks}
            onChange={(e) =>
              setSprintDurationWeeks(e.target.value === "2" ? 2 : 1)
            }
          >
            <option value={1}>Weekly sprint</option>
            <option value={2}>Biweekly sprint</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="proj-color">
            Color
          </label>
          <input
            id="proj-color"
            type="color"
            className="mt-1 h-9 w-full cursor-pointer rounded-md border border-slate-300"
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
          <p className="text-xs text-red-600">{update.error.message}</p>
        )}
        {update.isSuccess && (
          <p className="text-xs text-emerald-600">Settings saved.</p>
        )}
      </form>
      {children && (
        <div className="mt-5 border-t border-slate-100 pt-5">{children}</div>
      )}
    </div>
  );
}
