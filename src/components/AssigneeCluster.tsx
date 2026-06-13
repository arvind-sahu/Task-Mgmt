import { CachedAvatar } from "~/components/CachedAvatar";
import { initialsFromName } from "~/utils/avatar";

export type AssigneeUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  imageKey?: string | null;
};

type AssigneeClusterProps = {
  assignees: AssigneeUser[];
  emptyLabel?: string;
  maxNamed?: number;
  maxAvatars?: number;
  size?: "sm" | "md";
};

export function AssigneeCluster({
  assignees,
  emptyLabel = "No assignee",
  maxNamed = 2,
  maxAvatars = 2,
  size = "md",
}: AssigneeClusterProps) {
  if (assignees.length === 0) {
    return <span className="text-xs text-muted">{emptyLabel}</span>;
  }

  const avatarClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[10px]";
  const named = assignees.length <= maxNamed;

  if (named) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {assignees.map((assignee) => {
          const label = assignee.name ?? assignee.email;
          return (
            <span
              key={assignee.id}
              className="surface-row inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-heading"
            >
              <span
                className={`app-avatar grid ${avatarClass} place-items-center overflow-hidden rounded-full font-semibold`}
              >
                <CachedAvatar
                  user={assignee}
                  alt={label}
                  className="h-full w-full object-cover"
                  fallback={initialsFromName(assignee.name, assignee.email)}
                />
              </span>
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  const visible = assignees.slice(0, maxAvatars);
  const hiddenCount = assignees.length - visible.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {visible.map((assignee) => {
          const label = assignee.name ?? assignee.email;
          return (
            <span
              key={assignee.id}
              title={label}
              className={`app-avatar grid ${avatarClass} place-items-center overflow-hidden rounded-full font-semibold ring-2 ring-[var(--surface-elevated)]`}
            >
              <CachedAvatar
                user={assignee}
                alt={label}
                className="h-full w-full object-cover"
                fallback={initialsFromName(assignee.name, assignee.email)}
              />
            </span>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <span className="chip rounded-full px-2 py-0.5 text-[11px] font-semibold">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
