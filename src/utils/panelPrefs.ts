const SPRINT_PANEL_KEY = "tasker:sprint-panel-open";

export function readSprintPanelOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SPRINT_PANEL_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSprintPanelOpen(open: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SPRINT_PANEL_KEY, open ? "1" : "0");
  } catch {
    // Ignore private-mode storage errors.
  }
}
