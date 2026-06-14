import type { WorkflowStatus } from "~/utils/workflow";

type WorkflowStatusSelectProps = {
  value: string;
  options: WorkflowStatus[];
  onChange: (statusId: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

/** Status picker scoped to workflow-allowed options. */
export function WorkflowStatusSelect({
  value,
  options,
  onChange,
  disabled,
  className = "",
  placeholder = "Select status",
}: WorkflowStatusSelectProps) {
  return (
    <select
      value={value}
      disabled={disabled || options.length === 0}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
      }}
      className={`w-auto max-w-full rounded-full border-0 bg-[var(--input-bg)] py-0.5 pl-2 pr-6 text-xs font-medium text-[var(--input-text)] ring-1 ring-inset ring-[var(--border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] ${className}`}
      aria-label="Change task status"
    >
      {options.length === 0 ? (
        <option value="">{placeholder}</option>
      ) : null}
      {options.map((status) => (
        <option key={status.id} value={status.id}>
          {status.name}
        </option>
      ))}
    </select>
  );
}
