import { useState } from "react";

import { api } from "~/utils/api";

type ProjectSettingsPanelProps = {
  projectId: string;
  initial: {
    name: string;
    description: string | null;
    color: string;
  };
};

export function ProjectSettingsPanel({
  projectId,
  initial,
}: ProjectSettingsPanelProps) {
  const utils = api.useUtils();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [color, setColor] = useState(initial.color);

  const update = api.project.update.useMutation({
    onSuccess: async () => {
      await utils.project.byId.invalidate({ id: projectId });
      await utils.project.list.invalidate();
    },
  });

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold">Project settings</h3>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({
            id: projectId,
            name,
            description: description || undefined,
            color,
          });
        }}
      >
        <div>
          <label className="label" htmlFor="proj-name">
            Name
          </label>
          <input
            id="proj-name"
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
    </div>
  );
}
