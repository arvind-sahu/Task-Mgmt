/**
 * Format a `Date | string | null | undefined` as a short locale date, or `—`
 * when missing. Centralized so the UI is consistent everywhere.
 */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns "Overdue", "Today", "Tomorrow", or "in N days" / "N days ago".
 * Useful for surfacing deadlines on cards.
 */
export function relativeDeadline(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "No deadline";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "No deadline";

  // Strip time-of-day so comparisons are calendar-day based.
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

  const diffMs = startOfDay(d) - startOfDay(now);
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(diffMs / day);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
}

/** True if `value` is a date strictly before `now` (calendar-day precision). */
export function isOverdue(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!value) return false;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return startOfDay(d) < startOfDay(now);
}
