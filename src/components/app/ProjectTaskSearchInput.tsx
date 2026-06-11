type ProjectTaskSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
  id?: string;
  className?: string;
};

export function ProjectTaskSearchInput({
  value,
  onChange,
  filteredCount,
  totalCount,
  id = "project-task-search",
  className = "",
}: ProjectTaskSearchInputProps) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <label className="sr-only" htmlFor={id}>
        Search tasks in this project
      </label>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3-3" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        data-tour="global-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tasks…"
        className="input w-full min-w-0 py-1.5 pl-8 pr-[4.25rem] text-xs sm:w-44 md:w-52 lg:w-60"
      />
      {value && (
        <button
          type="button"
          className="absolute right-[3.25rem] top-1/2 -translate-y-1/2 rounded px-1 text-sm font-bold text-muted transition hover:text-heading"
          onClick={() => onChange("")}
          aria-label="Clear task search"
        >
          ×
        </button>
      )}
      <span className="chip pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] font-semibold">
        {filteredCount}/{totalCount}
      </span>
    </div>
  );
}
