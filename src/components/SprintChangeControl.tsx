import { useEffect, useMemo, useRef, useState } from "react";

import { resolveSprintLabel, sortSprintsByStart } from "~/utils/sprint";

export type SprintOption = {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
};

type SprintChangeControlProps = {
  value: string | null;
  sprints: SprintOption[];
  onChange: (sprintId: string | null) => void;
  onSprintSelected?: (sprint: SprintOption | null) => void;
  className?: string;
};

export function SprintChangeControl({
  value,
  sprints,
  onChange,
  onSprintSelected,
  className = "",
}: SprintChangeControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const orderedSprints = useMemo(() => sortSprintsByStart(sprints), [sprints]);
  const activeSprint =
    orderedSprints.find((sprint) => sprint.id === value) ?? null;
  const activeLabel = activeSprint
    ? resolveSprintLabel(
        activeSprint,
        orderedSprints.findIndex((sprint) => sprint.id === activeSprint.id),
      )
    : "Backlog";

  useEffect(() => {
    if (!open) return;
    function onOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick, true);
    return () => document.removeEventListener("mousedown", onOutsideClick, true);
  }, [open]);

  function selectSprint(sprintId: string | null) {
    onChange(sprintId);
    onSprintSelected?.(
      sprintId ? orderedSprints.find((sprint) => sprint.id === sprintId) ?? null : null,
    );
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative inline-flex items-center gap-2 ${className}`}>
      <span className="text-sm font-semibold text-heading">{activeLabel}</span>
      <button
        type="button"
        className="link-accent text-xs font-semibold hover:underline"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        Change sprint
      </button>
      {open && (
        <div className="app-dropdown absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl p-1 shadow-xl">
          <button
            type="button"
            className={`app-dropdown-item block w-full rounded-lg px-3 py-2 text-left text-sm ${
              value == null ? "chip-active" : ""
            }`}
            onClick={() => selectSprint(null)}
          >
            Backlog
          </button>
          {orderedSprints.map((sprint, index) => (
            <button
              key={sprint.id}
              type="button"
              className={`app-dropdown-item block w-full rounded-lg px-3 py-2 text-left text-sm ${
                sprint.id === value ? "chip-active" : ""
              }`}
              onClick={() => selectSprint(sprint.id)}
            >
              {resolveSprintLabel(sprint, index)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
