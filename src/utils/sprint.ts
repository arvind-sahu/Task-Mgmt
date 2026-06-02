/** Client-side sprint date helpers (mirrors server sprint rules). */

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function computeSprintEndDate(startDate: Date, durationWeeks: number) {
  const start = startOfDay(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + durationWeeks * 7 - 1);
  return endOfDay(end);
}

export function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatSprintEndPreview(startDateInput: string, durationWeeks: number) {
  if (!startDateInput) return "";
  return dateInputValue(computeSprintEndDate(new Date(startDateInput), durationWeeks));
}

export const SPRINT_DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function sprintPlanLabel(plan: string, durationWeeks: number, startDay: number | null) {
  if (plan === "BIWEEKLY") return "Bi-weekly (14 days)";
  if (plan === "CUSTOM_DAY" && startDay != null) {
    return `Weekly on ${SPRINT_DAY_LABELS[startDay] ?? "—"}`;
  }
  return durationWeeks === 2 ? "Bi-weekly (14 days)" : "Weekly (7 days)";
}
