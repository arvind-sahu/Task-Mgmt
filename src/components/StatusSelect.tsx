import { type TaskStatus } from "@prisma/client";

import { TASK_STATUSES, statusLabel } from "./Badges";

type StatusSelectProps = {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
  className?: string;
};

/** Inline status picker — use inside list cards; stops click propagation. */
export function StatusSelect({
  status,
  onChange,
  disabled,
  className = "",
}: StatusSelectProps) {
  return (
    <select
      value={status}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value as TaskStatus);
      }}
      className={`w-auto max-w-full rounded-full border-0 bg-[var(--input-bg)] py-0.5 pl-2 pr-6 text-xs font-medium text-[var(--input-text)] ring-1 ring-inset ring-[var(--border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] ${className}`}
      aria-label="Change task status"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {statusLabel[s]}
        </option>
      ))}
    </select>
  );
}
