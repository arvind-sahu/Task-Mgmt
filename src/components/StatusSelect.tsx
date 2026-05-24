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
      className={`rounded-full border-0 bg-white py-0.5 pl-2 pr-6 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 ${className}`}
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
