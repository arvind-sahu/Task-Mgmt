import Link from "next/link";
import { type RouterOutputs } from "~/utils/api";
import { PriorityBadge, StatusBadge } from "./Badges";
import { isOverdue, relativeDeadline } from "~/utils/date";

// Reuse the inferred row shape from the `task.list` router so this component
// always stays in sync with the server's payload — no manual prop typing.
type TaskListItem = RouterOutputs["task"]["list"][number];

export default function TaskCard({ task }: { task: TaskListItem }) {
  const overdue = isOverdue(task.deadline);

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-sm font-semibold text-slate-900">
          {task.title}
        </h4>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {task.tags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200"
            style={{ color: t.color, backgroundColor: `${t.color}15` }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            {t.name}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <div
              key={a.id}
              title={a.name ?? a.email}
              className="grid h-6 w-6 place-items-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 ring-2 ring-white"
            >
              {(a.name ?? a.email).charAt(0).toUpperCase()}
            </div>
          ))}
          {task.assignees.length > 3 && (
            <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
              +{task.assignees.length - 3}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          {task.deadline && (
            <span className={overdue ? "font-medium text-red-600" : ""}>
              {relativeDeadline(task.deadline)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
