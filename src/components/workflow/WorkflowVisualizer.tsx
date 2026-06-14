import type { ProjectWorkflow } from "~/utils/workflow";
import { getCreationStatuses, sortStatuses } from "~/utils/workflow";

type WorkflowVisualizerProps = {
  workflow: ProjectWorkflow;
  readOnly?: boolean;
};

export function WorkflowVisualizer({
  workflow,
  readOnly = true,
}: WorkflowVisualizerProps) {
  const statuses = sortStatuses(workflow.statuses);
  const creationIds = new Set(workflow.creationAllowedStatusIds);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => {
          const isCreation = creationIds.has(status.id);
          return (
            <div
              key={status.id}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                isCreation ? "ring-emerald-400" : "ring-[var(--border)]"
              }`}
              style={{
                color: status.color,
                backgroundColor: `${status.color}18`,
                borderColor: status.color,
              }}
              title={
                isCreation
                  ? "Tasks can be created in this status"
                  : status.isTerminal
                    ? "Terminal status"
                    : undefined
              }
            >
              {status.name}
              {status.isTerminal && (
                <span className="ml-1 text-[10px] opacity-70">terminal</span>
              )}
              {isCreation && (
                <span className="ml-1 text-[10px] text-emerald-600">create</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="surface-muted rounded-xl p-3 text-xs text-muted">
        <p className="mb-2 font-semibold text-heading">Allowed transitions</p>
        <ul className="space-y-1">
          {statuses.map((from) => {
            const targets = workflow.transitions
              .filter((t) => t.fromStatusId === from.id)
              .map((t) => statuses.find((s) => s.id === t.toStatusId)?.name)
              .filter(Boolean);
            return (
              <li key={from.id}>
                <span className="font-medium text-heading">{from.name}</span>
                <span className="text-muted"> → </span>
                {targets.length ? targets.join(", ") : "(none)"}
              </li>
            );
          })}
        </ul>
        {!readOnly && (
          <p className="mt-2 text-[11px]">
            Green badges mark statuses where new tasks can be created.
          </p>
        )}
      </div>

      <div className="text-xs text-muted">
        Creation rule:{" "}
        {workflow.settings.allowCreationInAnyNonTerminal
          ? "Any non-terminal status"
          : `First ${workflow.settings.creationLimit} statuses (${getCreationStatuses(workflow)
              .map((s) => s.name)
              .join(", ")})`}
      </div>
    </div>
  );
}
