import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

import { NotificationsBell } from "~/components/NotificationsBell";
import { CachedAvatar } from "~/components/CachedAvatar";
import { ProjectTaskSearchInput } from "~/components/app/ProjectTaskSearchInput";
import { type ProjectTab, isProjectTabActive } from "~/config/appNav";
import { api } from "~/utils/api";
import { initialsFromName } from "~/utils/avatar";
import { setWorkspaceCookie } from "~/utils/workspaceCookie";

type ProjectTaskSearchProps = {
  value: string;
  onChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
};

type AppTopBarProps = {
  headerTitle?: string;
  projectColor?: string;
  projectTabs?: ProjectTab[];
  projectTaskSearch?: ProjectTaskSearchProps;
  onOpenMobileMenu?: () => void;
  onCloseMobileMenu?: () => void;
};

export function AppTopBar({
  headerTitle,
  projectColor,
  projectTabs,
  projectTaskSearch,
  onOpenMobileMenu,
  onCloseMobileMenu,
}: AppTopBarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const me = api.user.me.useQuery(undefined, {
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
  const workspace = api.company.workspaceContext.useQuery(undefined, {
    enabled: !!session,
    staleTime: 60_000,
  });
  const switchWorkspace = api.company.switchWorkspace.useMutation({
    onSuccess: (data) => {
      setWorkspaceCookie(data.companyId);
      void router.reload();
    },
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = me.data?.name ?? session?.user?.name;
  const displayEmail = me.data?.email ?? session?.user?.email;
  const portraitUser =
    me.data ?? (session?.user ? { image: session.user.image, imageKey: null } : null);
  const initials = initialsFromName(displayName, displayEmail);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onOutsideClick, true);
    return () => document.removeEventListener("mousedown", onOutsideClick, true);
  }, [menuOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      void router.push(`/my-tasks?q=${encodeURIComponent(q)}`);
    }
  }

  function closeMenus() {
    setMenuOpen(false);
    onCloseMobileMenu?.();
  }

  const onProjectPage = router.pathname === "/projects/[id]";
  const showProjectHeader = onProjectPage && headerTitle;
  const showProjectTabs = onProjectPage && projectTabs && projectTabs.length > 0;

  function tabIsActive(tab: ProjectTab) {
    return isProjectTabActive(tab.key, router.pathname, router.query.view);
  }

  return (
    <header className="app-topbar shrink-0">
      <div className="flex min-h-[3.25rem] items-center gap-2 px-3 py-2 sm:px-4 lg:px-5">
        <button
          type="button"
          className="app-sidebar-toggle rounded-md p-2 lg:hidden"
          aria-label="Open menu"
          onClick={onOpenMobileMenu}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        {showProjectHeader ? (
          <div className="flex min-w-0 shrink items-center gap-2 lg:min-w-[10rem]">
            {projectColor && (
              <span
                className="hidden h-8 w-8 shrink-0 rounded-lg sm:grid sm:place-items-center sm:text-xs sm:font-bold sm:text-white"
                style={{ backgroundColor: projectColor }}
              >
                {headerTitle.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-heading sm:text-base">
                  {headerTitle}
                </span>
                <span className="app-badge hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide sm:inline-flex">
                  Project
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden min-w-[8rem] lg:block" aria-hidden />
        )}

        {showProjectTabs && (
          <nav className="app-topbar-tabs hidden min-w-0 flex-1 justify-center md:flex">
            <ul className="flex items-center gap-0.5">
              {projectTabs!.map((tab) => {
                const active = tabIsActive(tab);
                return (
                  <li key={tab.key}>
                    <Link
                      href={tab.href}
                      className={`app-topbar-tab inline-block whitespace-nowrap px-3 py-2 text-sm font-medium transition ${
                        active ? "app-topbar-tab-active" : ""
                      }`}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="ml-auto flex min-w-0 shrink items-center gap-1 sm:gap-2">
          {projectTaskSearch ? (
            <ProjectTaskSearchInput
              value={projectTaskSearch.value}
              onChange={projectTaskSearch.onChange}
              filteredCount={projectTaskSearch.filteredCount}
              totalCount={projectTaskSearch.totalCount}
              className="hidden min-w-0 flex-1 sm:block sm:max-w-xs md:max-w-sm lg:max-w-md"
            />
          ) : (
            <form onSubmit={submitSearch} className="hidden sm:block">
              <label className="sr-only" htmlFor="global-search">
                Search tasks
              </label>
              <div className="app-topbar-search relative">
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" strokeLinecap="round" />
                </svg>
                <input
                  id="global-search"
                  data-tour="global-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks…"
                  className="input w-36 py-1.5 pl-8 text-xs lg:w-48 xl:w-56"
                />
              </div>
            </form>
          )}

          <NotificationsBell />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              data-tour="profile-menu"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="app-nav-link flex items-center gap-1.5 rounded-full border border-transparent p-0.5 transition sm:pr-2"
              aria-label="Open profile menu"
              aria-expanded={menuOpen}
            >
              <span className="app-avatar grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold">
                <CachedAvatar
                  user={portraitUser}
                  alt={displayName ?? "Profile"}
                  className="h-full w-full object-cover"
                  fallback={initials}
                />
              </span>
              <span className="hidden max-w-[7rem] truncate text-xs font-medium text-heading md:inline">
                {displayName?.split(" ")[0] ?? "Account"}
              </span>
              <span className="hidden text-xs text-muted md:inline">▾</span>
            </button>
            {menuOpen && (
              <div className="app-dropdown absolute right-0 z-[70] mt-2 w-56 overflow-hidden rounded-md shadow-xl">
                <div
                  className="border-b px-3 py-2"
                  style={{ borderColor: "var(--border-muted)" }}
                >
                  <p className="text-sm font-semibold text-heading">{displayName ?? "User"}</p>
                  <p className="truncate text-xs text-muted">{displayEmail}</p>
                </div>
                {workspace.data && workspace.data.workspaces.length > 0 && (
                  <div
                    className="border-b p-1"
                    style={{ borderColor: "var(--border-muted)" }}
                  >
                    <button
                      type="button"
                      className="app-dropdown-item flex w-full items-center justify-between rounded-md px-3 py-2 text-sm"
                      onClick={() => setWorkspaceOpen((o) => !o)}
                    >
                      <span>Switch workspace</span>
                      <span className="text-xs text-muted">▾</span>
                    </button>
                    {workspaceOpen && (
                      <ul className="max-h-40 overflow-y-auto py-1">
                        {workspace.data.workspaces.map((w) => (
                          <li key={w.id}>
                            <button
                              type="button"
                              className={`app-dropdown-item w-full rounded-md px-3 py-2 text-left text-sm ${
                                w.id === workspace.data.activeCompanyId
                                  ? "font-semibold"
                                  : ""
                              }`}
                              disabled={switchWorkspace.isPending}
                              onClick={() => {
                                if (w.id === workspace.data?.activeCompanyId) {
                                  setWorkspaceOpen(false);
                                  return;
                                }
                                switchWorkspace.mutate({ companyId: w.id });
                                closeMenus();
                              }}
                            >
                              {w.name}
                              <span className="ml-1 text-xs text-muted">
                                ({w.role.replace("_", " ").toLowerCase()})
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="p-1">
                  <Link
                    href="/profile"
                    className="app-dropdown-item block rounded-md px-3 py-2 text-sm"
                    onClick={closeMenus}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/profile?tab=settings"
                    className="app-dropdown-item block rounded-md px-3 py-2 text-sm"
                    onClick={closeMenus}
                  >
                    Settings
                  </Link>
                  <Link
                    href="/profile?tab=security"
                    className="app-dropdown-item block rounded-md px-3 py-2 text-sm"
                    onClick={closeMenus}
                  >
                    Security
                  </Link>
                </div>
                <div className="border-t p-1" style={{ borderColor: "var(--border-muted)" }}>
                  <button
                    type="button"
                    onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                    className="w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-[var(--danger-hover-bg)]"
                    style={{ color: "var(--danger-text)" }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {projectTaskSearch && (
        <div
          className="border-t px-3 py-2 sm:hidden"
          style={{ borderColor: "var(--nav-border)" }}
        >
          <ProjectTaskSearchInput
            value={projectTaskSearch.value}
            onChange={projectTaskSearch.onChange}
            filteredCount={projectTaskSearch.filteredCount}
            totalCount={projectTaskSearch.totalCount}
            id="project-task-search-mobile"
          />
        </div>
      )}

      {showProjectTabs && (
        <nav
          className="app-topbar-tabs-mobile flex flex-wrap gap-1 border-t px-2 py-1.5 md:hidden"
          style={{ borderColor: "var(--nav-border)" }}
        >
          {projectTabs!.map((tab) => {
            const active = tabIsActive(tab);
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  active ? "btn-primary py-1" : "chip"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
