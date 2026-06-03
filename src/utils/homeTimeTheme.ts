export const HOME_TIME_THEME_SLOTS = [
  "sunrise",
  "morning",
  "late-morning",
  "noon",
  "afternoon",
  "sunset",
  "night",
  "late-night",
  "pre-dawn",
] as const;

export type HomeTimeThemeSlot = (typeof HOME_TIME_THEME_SLOTS)[number];

export type HomeTimeThemeOverride = "auto" | HomeTimeThemeSlot;

export const HOME_TIME_OVERRIDE_KEY = "tasker.home.themeOverride";

export const HOME_TIME_THEME_LABELS: Record<HomeTimeThemeSlot, string> = {
  sunrise: "Sunrise",
  morning: "Morning",
  "late-morning": "Late morning",
  noon: "Noon",
  afternoon: "Afternoon",
  sunset: "Sunset / evening",
  night: "Night",
  "late-night": "Late night",
  "pre-dawn": "Pre-dawn",
};

/** Resolve theme from the user's local device hour (start-of-hour boundaries). */
export function getHomeTimeThemeFromDate(date = new Date()): HomeTimeThemeSlot {
  const hour = date.getHours();

  if (hour >= 5 && hour <= 6) return "sunrise";
  if (hour >= 7 && hour <= 9) return "morning";
  if (hour >= 10 && hour <= 11) return "late-morning";
  if (hour >= 12 && hour <= 14) return "noon";
  if (hour >= 15 && hour <= 17) return "afternoon";
  if (hour >= 18 && hour <= 20) return "sunset";
  if (hour >= 21 && hour <= 23) return "night";
  if (hour >= 0 && hour <= 2) return "late-night";
  if (hour >= 3 && hour <= 4) return "pre-dawn";

  return "morning";
}

export function readHomeTimeThemeOverride(): HomeTimeThemeOverride {
  if (typeof window === "undefined") return "auto";
  try {
    const value = window.localStorage.getItem(HOME_TIME_OVERRIDE_KEY);
    if (value === "auto" || !value) return "auto";
    if (HOME_TIME_THEME_SLOTS.includes(value as HomeTimeThemeSlot)) {
      return value as HomeTimeThemeSlot;
    }
  } catch {
    // private mode
  }
  return "auto";
}

export function resolveHomeTimeTheme(
  date = new Date(),
  override: HomeTimeThemeOverride = "auto",
): HomeTimeThemeSlot {
  if (override !== "auto") return override;
  try {
    return getHomeTimeThemeFromDate(date);
  } catch {
    return "morning";
  }
}

/** Milliseconds until the next local hour boundary (theme may change). */
export function msUntilNextHourBoundary(date = new Date()): number {
  const next = new Date(date);
  next.setHours(date.getHours() + 1, 0, 0, 0);
  return Math.max(next.getTime() - date.getTime(), 1_000);
}

export function isHomeTimeThemeDark(slot: HomeTimeThemeSlot): boolean {
  return (
    slot === "sunset" ||
    slot === "night" ||
    slot === "late-night" ||
    slot === "pre-dawn"
  );
}

export function homeTimeThemeIcon(slot: HomeTimeThemeSlot): string {
  switch (slot) {
    case "sunrise":
      return "🌅";
    case "morning":
    case "late-morning":
    case "noon":
      return "☀️";
    case "afternoon":
      return "🌤️";
    case "sunset":
      return "🌇";
    case "night":
    case "late-night":
    case "pre-dawn":
      return "🌙";
    default:
      return "☀️";
  }
}
