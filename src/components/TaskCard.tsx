import Link from "next/link";

import { type RouterOutputs } from "~/utils/api";
import { PriorityBadge, priorityCardStyles } from "./Badges";
import { CachedAvatar } from "./CachedAvatar";
import {
  isTaskCompleted,
  TaskCompletedTick,
  TaskDeadlineBadge,
  TaskMetaCounts,
} from "./TaskIndicators";
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
  const completed = isTaskCompleted(task.status);

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h4 className="flex min-w-0 flex-1 items-start gap-1.5 text-[13px] font-semibold leading-snug text-heading">
          {completed && <TaskCompletedTick className="mt-0.5" />}
          <span className="line-clamp-2 min-w-0">
            <HighlightedText text={task.title} query={searchQuery} />
          </span>
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
                    user={a}
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

        <div className="flex shrink-0 items-center gap-2">
          <TaskMetaCounts
            commentCount={task._count.comments}
            attachmentCount={task._count.attachments}
          />
          <TaskDeadlineBadge deadline={task.deadline} status={task.status} />
        </div>
      </div>
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
