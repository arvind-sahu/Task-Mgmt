/**
 * Format a `Date | string | null | undefined` as a short locale date, or `—`
 * when missing. Centralized so the UI is consistent everywhere.
 */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function wasEdited(
  createdAt: Date | string,
  updatedAt: Date | string,
): boolean {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  return updated - created > 2000;
}

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

/** Calendar-day difference: positive = future, negative = past. */
export function daysUntilDeadline(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(d) - startOfDay(now)) / day);
}

const BOARD_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Board due-date text, e.g. "7 Jun" (day + abbreviated month). */
export function formatBoardDueDate(
  value: Date | string | null | undefined,
): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${BOARD_MONTHS[d.getMonth()]}`;
}

/** @deprecated Use formatBoardDueDate for task board chips. */
export function formatShortDate(value: Date | string | null | undefined): string {
  return formatBoardDueDate(value);
}

/**
 * Board due-date chip: "1d"/"2d" when within 2 days, "Today" for same day,
 * otherwise a short date when more than 2 days out. Returns "" when overdue
 * (show the overdue badge instead).
 */
export function boardDeadlineLabel(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  const days = daysUntilDeadline(value, now);
  if (days == null) return "";
  if (days < 0) return "";
  if (days === 0) return "Today";
  if (days === 1) return "1d";
  if (days === 2) return "2d";
  return formatBoardDueDate(value);
}

/**
 * Compact day-based label for task cards: "Today", "1 day", "2 days", "7 days ago".
 */
export function deadlineDayLabel(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

  const diffMs = startOfDay(d) - startOfDay(now);
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(diffMs / day);

  if (days === 0) return "Today";
  const count = Math.abs(days);
  const unit = count === 1 ? "day" : "days";
  if (days > 0) return `${count} ${unit}`;
  return `${count} ${unit} ago`;
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
