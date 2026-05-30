import Link from "next/link";
import { TaskPriority } from "@prisma/client";

import { type RouterOutputs } from "~/utils/api";
import { PriorityBadge, priorityCardStyles } from "./Badges";
import { deadlineDayLabel, isOverdue } from "~/utils/date";
import { initialsFromName } from "~/utils/avatar";

type TaskListItem = RouterOutputs["task"]["list"][number];

type TaskCardProps = {
  task: TaskListItem;
  onOpen?: (taskId: string) => void;
  searchQuery?: string;
};

export default function TaskCard({
  task,
  onOpen,
  searchQuery = "",
}: TaskCardProps) {
  const overdue = isOverdue(task.deadline);
  const deadlineLabel = deadlineDayLabel(task.deadline);

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">
          <HighlightedText text={task.title} query={searchQuery} />
        </h4>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
          <HighlightedText text={task.description} query={searchQuery} />
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          {task.assignees.length === 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
              No assignee
            </span>
          ) : (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  title={a.name ?? a.email}
                  className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 ring-2 ring-white"
                >
                  {a.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.image}
                      alt={a.name ?? a.email}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initialsFromName(a.name, a.email)
                  )}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        {deadlineLabel && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] leading-4 ring-1 ring-slate-200 ${
              overdue
                ? "bg-red-50 font-medium text-red-600 ring-red-200"
                : deadlineLabel === "Today"
                  ? "bg-amber-50 font-medium text-amber-700 ring-amber-200"
                  : "bg-slate-50 text-slate-500"
            }`}
          >
            {deadlineLabel}
          </span>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
          {task.tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200"
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
      )}
    </>
  );

  const priorityBorder = priorityCardStyles[task.priority];

  return (
    <div
      className={`rounded-lg bg-white p-3 shadow-sm transition hover:shadow-md ${priorityBorder} ${
        task.priority === TaskPriority.URGENT
          ? "hover:border-red-600"
          : task.priority === TaskPriority.HIGH
            ? "hover:border-orange-500"
            : "hover:border-indigo-300"
      }`}
    >
      {onOpen ? (
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => onOpen(task.id)}
        >
          {content}
        </button>
      ) : (
        <Link href={`/tasks/${task.id}`} className="block">
          {content}
        </Link>
      )}
    </div>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const words = (query.toLowerCase().match(/[a-z0-9#._-]+/g) ?? [])
    .filter((word) => word.length >= 2)
    .sort((a, b) => b.length - a.length);

  if (!words.length) return <>{text}</>;

  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) =>
        words.some((word) => part.toLowerCase() === word) ? (
          <mark
            // eslint-disable-next-line react/no-array-index-key
            key={`${part}-${index}`}
            className="rounded bg-yellow-200 px-0.5 text-inherit"
          >
            {part}
          </mark>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}
