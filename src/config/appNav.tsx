import type { ReactNode } from "react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badgeKey?: "inbox";
  comingSoon?: boolean;
  /** Target for the in-app welcome tour (`data-tour`). */
  tourId?: string;
};

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export const primaryNavItems: AppNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    tourId: "nav-dashboard",
    icon: (
      <Icon d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" />
    ),
  },
  {
    href: "/my-tasks",
    label: "My Tasks",
    tourId: "nav-my-tasks",
    icon: <Icon d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />,
  },
  {
    href: "/inbox",
    label: "Inbox",
    tourId: "nav-inbox",
    icon: (
      <Icon d="M22 12H16l-3 9-3-9H2M4 6h16a2 2 0 012 2v4H2V8a2 2 0 012-2z" />
    ),
    badgeKey: "inbox",
  },
  {
    href: "/projects",
    label: "Projects",
    tourId: "nav-projects",
    icon: (
      <Icon d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    ),
  },
];

export const secondaryNavItems: AppNavItem[] = [
  {
    href: "/teams",
    label: "Teams",
    icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
    comingSoon: true,
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: (
      <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    ),
    comingSoon: true,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: <Icon d="M18 20V10M12 20V4M6 20v-6" />,
    comingSoon: true,
  },
  {
    href: "/my-timeline",
    label: "Time Tracking",
    tourId: "nav-time-tracking",
    icon: <Icon d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    href: "/files",
    label: "Files",
    icon: (
      <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6" />
    ),
    comingSoon: true,
  },
  {
    href: "/profile?tab=settings",
    label: "Settings",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px] shrink-0"
        aria-hidden
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
];

export type ProjectTab = {
  key: string;
  label: string;
  href: string;
};

export function projectTabsForId(projectId: string): ProjectTab[] {
  return [
    { key: "overview", label: "Overview", href: `/coming-soon?feature=Overview&project=${projectId}` },
    { key: "board", label: "Board", href: `/projects/${projectId}` },
    { key: "timeline", label: "Timeline", href: `/projects/${projectId}/timeline` },
    { key: "analytics", label: "Analytics", href: `/coming-soon?feature=Analytics&project=${projectId}` },
    { key: "files", label: "Files", href: `/coming-soon?feature=Files&project=${projectId}` },
    { key: "settings", label: "Settings", href: `/projects/${projectId}?view=settings` },
  ];
}

export function projectViewFromQuery(view: string | string[] | undefined) {
  return view === "settings" ? "settings" : "board";
}

export function isProjectTabActive(
  tabKey: string,
  pathname: string,
  view: string | string[] | undefined,
) {
  if (tabKey === "timeline" && pathname === "/projects/[id]/timeline") {
    return true;
  }
  if (pathname !== "/projects/[id]") return false;
  const currentView = projectViewFromQuery(view);
  if (tabKey === "board") return currentView === "board";
  if (tabKey === "settings") return currentView === "settings";
  return false;
}
