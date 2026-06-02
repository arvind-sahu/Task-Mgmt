import { SprintPlan } from "@prisma/client";

export const SPRINT_DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type SprintProjectRules = {
  sprintPlan: SprintPlan;
  sprintDurationWeeks: number;
  sprintStartDayOfWeek: number | null;
};

export function durationWeeksForPlan(plan: SprintPlan): 1 | 2 {
  return plan === SprintPlan.BIWEEKLY ? 2 : 1;
}

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

export function nextDayStart(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + 1);
  return next;
}

export function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function computeSprintEndDate(startDate: Date, durationWeeks: number) {
  const start = startOfDay(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + durationWeeks * 7 - 1);
  return endOfDay(end);
}

export function assertValidStartDayOfWeek(
  rules: SprintProjectRules,
  startDate: Date,
): void {
  if (rules.sprintPlan !== SprintPlan.CUSTOM_DAY) return;
  if (rules.sprintStartDayOfWeek == null) {
    throw new Error("Project is missing a sprint start day");
  }
  if (startOfDay(startDate).getDay() !== rules.sprintStartDayOfWeek) {
    throw new Error(
      `Sprint must start on ${SPRINT_DAY_LABELS[rules.sprintStartDayOfWeek]}`,
    );
  }
}

export function sprintMatchesDuration(
  startDate: Date,
  endDate: Date,
  durationWeeks: number,
) {
  const expectedEnd = computeSprintEndDate(startDate, durationWeeks);
  return sameDay(endDate, expectedEnd);
}

export type SprintTimelineEntry = {
  id?: string;
  startDate: Date;
  endDate: Date;
};

export function timelineViolations(
  timeline: SprintTimelineEntry[],
): "overlap" | "gap" | null {
  const sorted = [...timeline].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (!current || !next) continue;
    if (next.startDate <= current.endDate) return "overlap";
    if (!sameDay(next.startDate, nextDayStart(current.endDate))) return "gap";
  }
  return null;
}

export function sprintViolatesProjectRules(
  rules: SprintProjectRules,
  sprint: { startDate: Date; endDate: Date },
): boolean {
  if (
    !sprintMatchesDuration(
      sprint.startDate,
      sprint.endDate,
      rules.sprintDurationWeeks,
    )
  ) {
    return true;
  }
  if (rules.sprintPlan === SprintPlan.CUSTOM_DAY) {
    if (rules.sprintStartDayOfWeek == null) return true;
    if (startOfDay(sprint.startDate).getDay() !== rules.sprintStartDayOfWeek) {
      return true;
    }
  }
  return false;
}

export function findInvalidSprintIds(
  rules: SprintProjectRules,
  sprints: Array<{ id: string; startDate: Date; endDate: Date }>,
): string[] {
  const invalid = new Set<string>();
  const sorted = [...sprints].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );

  let lastValidEnd: Date | null = null;
  for (const sprint of sorted) {
    if (sprintViolatesProjectRules(rules, sprint)) {
      invalid.add(sprint.id);
      continue;
    }
    if (lastValidEnd) {
      if (
        sprint.startDate <= lastValidEnd ||
        !sameDay(sprint.startDate, nextDayStart(lastValidEnd))
      ) {
        invalid.add(sprint.id);
        continue;
      }
    }
    lastValidEnd = sprint.endDate;
  }

  return [...invalid];
}

/** Client-safe date input value (YYYY-MM-DD). */
export function dateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatSprintEndPreview(startDateInput: string, durationWeeks: number) {
  if (!startDateInput) return "";
  const end = computeSprintEndDate(new Date(startDateInput), durationWeeks);
  return dateInputValue(end);
}

export function nearestValidStartDate(
  rules: SprintProjectRules,
  from: Date = new Date(),
): Date {
  const start = startOfDay(from);
  if (rules.sprintPlan !== SprintPlan.CUSTOM_DAY || rules.sprintStartDayOfWeek == null) {
    return start;
  }
  const target = rules.sprintStartDayOfWeek;
  let cursor = start;
  for (let i = 0; i < 7; i += 1) {
    if (cursor.getDay() === target) return cursor;
    cursor = nextDayStart(cursor);
  }
  return start;
}
