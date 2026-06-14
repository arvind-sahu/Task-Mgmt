import { TaskStatus } from "@prisma/client";

import { boardDeadlineLabel, formatBoardDueDate, isOverdue } from "~/utils/date";

export function TaskCompletedTick({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      title="Completed"
      aria-label="Completed"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4 text-blue-500"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

export function CalendarDueIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OverdueIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CommentCountIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AttachmentCountIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type TaskDeadlineBadgeProps = {
  deadline: Date | string | null | undefined;
  status: TaskStatus;
  size?: "sm" | "md";
};

export function TaskDeadlineBadge({
  deadline,
  status,
  size = "sm",
}: TaskDeadlineBadgeProps) {
  if (!deadline || status === TaskStatus.DONE) return null;

  const overdue = isOverdue(deadline);
  const label = boardDeadlineLabel(deadline);
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const pad = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  if (overdue) {
    return (
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${textSize} ${pad}`}
        style={{
          color: "var(--danger-text)",
          backgroundColor: "var(--danger-hover-bg)",
        }}
      >
        <OverdueIcon />
        Overdue
      </span>
    );
  }

  if (!label) return null;

  const isSoon = label === "Today" || label === "1d" || label === "2d";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full ${pad} ${textSize} leading-4 ring-1 ${
        label === "Today" ? "font-medium ring-[var(--warning-border)]" : "chip"
      }`}
      style={
        label === "Today"
          ? {
              color: "var(--warning-text)",
              backgroundColor: "var(--warning-bg)",
            }
          : isSoon
            ? {
                color: "var(--accent-muted-text)",
                backgroundColor: "var(--accent-muted-bg)",
              }
            : undefined
      }
    >
      <CalendarDueIcon />
      {label}
    </span>
  );
}

type TaskMetaCountsProps = {
  commentCount: number;
  attachmentCount: number;
};

export function TaskMetaCounts({ commentCount, attachmentCount }: TaskMetaCountsProps) {
  if (commentCount === 0 && attachmentCount === 0) return null;

  return (
    <div className="flex items-center gap-2 text-muted">
      {commentCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5 text-[10px] font-medium"
          title={`${commentCount} comment${commentCount === 1 ? "" : "s"}`}
        >
          <CommentCountIcon />
          {commentCount}
        </span>
      )}
      {attachmentCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5 text-[10px] font-medium"
          title={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
        >
          <AttachmentCountIcon />
          {attachmentCount}
        </span>
      )}
    </div>
  );
}

export function isTaskCompleted(
  status: TaskStatus,
  projectStatus?: { isTerminal?: boolean } | null,
): boolean {
  if (projectStatus?.isTerminal) return true;
  return status === TaskStatus.DONE;
}
