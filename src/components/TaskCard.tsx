import Link from "next/link";
import { TaskPriority } from "@prisma/client";

import { type RouterOutputs } from "~/utils/api";
import { PriorityBadge, priorityCardStyles } from "./Badges";
import { CachedAvatar } from "./CachedAvatar";
import { TagChip } from "./TagChip";
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
        <h4 className="line-clamp-2 text-[13px] font-semibold leading-snug text-heading">
          <HighlightedText text={task.title} query={searchQuery} />
        </h4>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted">
          <HighlightedText text={task.description} query={searchQuery} />
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          {task.assignees.length === 0 ? (
            <span className="chip rounded-full px-2 py-0.5 text-[10px] font-medium">
              No assignee
            </span>
          ) : (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  title={a.name ?? a.email}
                  className="app-avatar grid h-6 w-6 place-items-center overflow-hidden rounded-full text-[10px] font-semibold ring-2 ring-[var(--surface-elevated)]"
                >
                  <CachedAvatar
                    src={a.image}
                    alt={a.name ?? a.email}
                    className="h-full w-full object-cover"
                    fallback={initialsFromName(a.name, a.email)}
                  />
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="chip grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ring-2 ring-[var(--surface-elevated)]">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        {deadlineLabel && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] leading-4 ring-1 ${
              overdue
                ? "font-medium ring-[var(--danger-text)]/30"
                : deadlineLabel === "Today"
                  ? "font-medium ring-[var(--warning-border)]"
                  : "chip"
            }`}
            style={
              overdue
                ? {
                    color: "var(--danger-text)",
                    backgroundColor: "var(--danger-hover-bg)",
                  }
                : deadlineLabel === "Today"
                  ? {
                      color: "var(--warning-text)",
                      backgroundColor: "var(--warning-bg)",
                    }
                  : undefined
            }
          >
            {deadlineLabel}
          </span>
        )}
      </div>

      {task.tags.length > 0 && (
        <div
          className="mt-2 flex flex-wrap gap-1 border-t pt-2"
          style={{ borderColor: "var(--border-muted)" }}
        >
          {task.tags.map((t) => (
            <TagChip key={t.id} name={t.name} color={t.color} size="sm" />
          ))}
        </div>
      )}
      {task._count.comments > 0 && (
        <p className="mt-2 text-[10px] text-muted">
          {task._count.comments} comment{task._count.comments === 1 ? "" : "s"}
        </p>
      )}
    </>
  );

  const priorityBorder = priorityCardStyles[task.priority];

  return (
    <div
      className={`task-tile rounded-lg p-3 transition hover:shadow-md ${priorityBorder}`}
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
            className="search-hit"
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
