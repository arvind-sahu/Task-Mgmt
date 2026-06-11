import Link from "next/link";
import { useRouter } from "next/router";

import { UpgradePlanCard } from "~/components/app/UpgradePlanCard";
import {
  primaryNavItems,
  secondaryNavItems,
  type AppNavItem,
} from "~/config/appNav";
import { api } from "~/utils/api";

type AppSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

function isActive(pathname: string, asPath: string, href: string) {
  const base = href.split("?")[0] ?? href;
  if (href.includes("?")) {
    return asPath === href || asPath.startsWith(`${href}&`);
  }
  if (base === "/dashboard") return pathname === "/dashboard";
  return pathname === base || pathname.startsWith(`${base}/`);
}

function NavLink({
  item,
  active,
  collapsed,
  badge,
  onNavigate,
}: {
  item: AppNavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      data-tour={item.tourId}
      className={`app-sidebar-link group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
        active ? "app-sidebar-link-active" : ""
      } ${collapsed ? "justify-center px-2" : ""}`}
    >
      <span className="relative shrink-0">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {badge != null && badge > 0 && (
            <span className="app-sidebar-badge flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
          {item.comingSoon && (
            <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
              Soon
            </span>
          )}
        </>
      )}
      {collapsed && badge != null && badge > 0 && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
      )}
    </Link>
  );
}

export function AppSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: AppSidebarProps) {
  const router = useRouter();
  const workspace = api.company.workspaceContext.useQuery(undefined, {
    staleTime: 60_000,
  });
  const projects = api.project.list.useQuery(undefined, {
    staleTime: 60_000,
  });
  const unread = api.notification.unreadCount.useQuery(undefined, {
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const starred = projects.data?.slice(0, 4) ?? [];
  const inboxCount = unread.data ?? 0;
  const effectiveCollapsed = collapsed && !mobileOpen;

  const sidebarBody = (
    <>
      <div
        className={`app-sidebar-header flex shrink-0 items-center border-b ${
          effectiveCollapsed ? "justify-center px-2 py-3" : "justify-between px-3 py-3"
        }`}
      >
        {!effectiveCollapsed && (
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2"
            onClick={onCloseMobile}
          >
            <div className="app-brand-mark grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold">
              T
            </div>
            <span className="truncate text-base font-semibold text-heading">Tasker</span>
          </Link>
        )}
        {effectiveCollapsed && (
          <Link href="/dashboard" onClick={onCloseMobile} className="app-brand-mark grid h-8 w-8 place-items-center rounded-lg text-sm font-bold">
            T
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="app-sidebar-toggle hidden rounded-md p-1.5 transition lg:inline-flex"
          aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="text-xs font-bold text-muted">{effectiveCollapsed ? "»" : "«"}</span>
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(router.pathname, router.asPath, item.href)}
              collapsed={effectiveCollapsed}
              badge={item.badgeKey === "inbox" ? inboxCount : undefined}
              onNavigate={onCloseMobile}
            />
          ))}
        </div>

        {(workspace.data?.canManageCompany || workspace.data?.canInviteUsers) && (
          <div className="mb-2 space-y-0.5">
            <NavLink
              item={{
                href: "/company/users",
                label: "Company users",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="h-[18px] w-[18px] shrink-0"
                    aria-hidden
                  >
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                ),
              }}
              active={isActive(router.pathname, router.asPath, "/company/users")}
              collapsed={effectiveCollapsed}
              onNavigate={onCloseMobile}
            />
          </div>
        )}

        <div className="my-3 border-t" style={{ borderColor: "var(--nav-border)" }} />

        <div className="space-y-0.5">
          {secondaryNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(router.pathname, router.asPath, item.href)}
              collapsed={effectiveCollapsed}
              onNavigate={onCloseMobile}
            />
          ))}
        </div>

        {!effectiveCollapsed && starred.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Starred projects
            </p>
            <ul className="space-y-0.5">
              {starred.map((p) => {
                const active = router.asPath.startsWith(`/projects/${p.id}`);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      onClick={onCloseMobile}
                      className={`app-sidebar-link flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
                        active ? "app-sidebar-link-active" : ""
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate font-medium">{p.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div
        className={`shrink-0 border-t p-2 ${effectiveCollapsed ? "flex justify-center" : ""}`}
        style={{ borderColor: "var(--nav-border)" }}
      >
        <UpgradePlanCard collapsed={effectiveCollapsed} />
      </div>
    </>
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="app-sidebar-overlay fixed inset-0 z-40 lg:hidden"
          aria-label="Close menu"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          mobileOpen || !collapsed
            ? "w-[15.5rem]"
            : "app-sidebar-collapsed w-[4.25rem]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {sidebarBody}
      </aside>
    </>
  );
}
