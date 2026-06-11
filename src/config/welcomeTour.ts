export type WelcomeTourStep = {
  id: string;
  /** CSS selector matching `data-tour` on a DOM node. */
  target: string;
  title: string;
  body: string;
  /** Tooltip placement relative to the target. */
  placement?: "bottom" | "top" | "left" | "right";
};

export const welcomeTourSteps: WelcomeTourStep[] = [
  {
    id: "dashboard",
    target: '[data-tour="nav-dashboard"]',
    title: "Your dashboard",
    body: "See project health, analytics, and what needs attention at a glance.",
    placement: "right",
  },
  {
    id: "my-tasks",
    target: '[data-tour="nav-my-tasks"]',
    title: "My Tasks",
    body: "Every task assigned to you lives here — filter, search, and update status quickly.",
    placement: "right",
  },
  {
    id: "projects",
    target: '[data-tour="nav-projects"]',
    title: "Projects",
    body: "Open a project board to manage sprints, columns, and team work.",
    placement: "right",
  },
  {
    id: "inbox",
    target: '[data-tour="nav-inbox"]',
    title: "Inbox",
    body: "Assignments, comments, and invites show up here so nothing gets missed.",
    placement: "right",
  },
  {
    id: "search",
    target: '[data-tour="global-search"]',
    title: "Search tasks",
    body: "Jump to work across projects by title or keyword from anywhere in the app.",
    placement: "bottom",
  },
  {
    id: "profile",
    target: '[data-tour="profile-menu"]',
    title: "Profile & workspaces",
    body: "Update your profile, switch company workspaces, or sign out from this menu.",
    placement: "bottom",
  },
];

export const WELCOME_TOUR_STORAGE_KEY = "tasker_welcome_tour_done";
export const WELCOME_TOUR_PENDING_KEY = "tasker_welcome_tour_pending";

export function isWelcomeTourDone(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WELCOME_TOUR_STORAGE_KEY) === "1";
}

export function markWelcomeTourDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WELCOME_TOUR_STORAGE_KEY, "1");
  sessionStorage.removeItem(WELCOME_TOUR_PENDING_KEY);
}

export function shouldStartWelcomeTour(): boolean {
  if (typeof window === "undefined") return false;
  if (isWelcomeTourDone()) return false;
  return sessionStorage.getItem(WELCOME_TOUR_PENDING_KEY) === "1";
}

export function queueWelcomeTour(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(WELCOME_TOUR_PENDING_KEY, "1");
}
