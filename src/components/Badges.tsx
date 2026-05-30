import { TaskPriority, TaskStatus } from "@prisma/client";

// Visual mapping for the status / priority enums. Keeping this colocated
// avoids string-typed switches scattered across pages.

const statusStyles: Record<TaskStatus, string> = {
  BACKLOG: "bg-violet-50 text-violet-700 ring-violet-200",
  TODO: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
  IN_REVIEW: "bg-amber-50 text-amber-700 ring-amber-200",
  DONE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const statusLabel: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

const priorityStyles: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-200",
  MEDIUM: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-200",
  URGENT: "bg-red-50 text-red-700 ring-red-200",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityStyles[priority]}`}
    >
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

export const TASK_STATUSES: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

export const TASK_PRIORITIES: TaskPriority[] = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
];

/** Card border + glow used on kanban task cards. */
export const priorityCardStyles: Record<TaskPriority, string> = {
  LOW: "border border-slate-200",
  MEDIUM: "border border-slate-300",
  HIGH: "border border-orange-400 shadow-[0_0_0_0.5px_rgba(251,146,60,0.35)]",
  URGENT:
    "border border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5),0_2px_12px_rgba(239,68,68,0.22)]",
};

export { statusLabel };
