import { signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { NotificationsBell } from "~/components/NotificationsBell";
import { CachedAvatar } from "~/components/CachedAvatar";
import { api } from "~/utils/api";
import { initialsFromName } from "~/utils/avatar";

interface LayoutProps {
  title?: string;
  children: ReactNode;
  contentClassName?: string;
  headerTitle?: string;
  compactBrand?: boolean;
}

/**
 * App shell: top navigation + main content area. Used on every authenticated
 * page so the navigation experience is consistent. Auth pages render their
 * own minimal shell (see /auth/*).
 */
export default function Layout({
  title,
  children,
  contentClassName,
  headerTitle,
  compactBrand = false,
}: LayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const me = api.user.me.useQuery(undefined, {
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
  ];

  const displayName = me.data?.name ?? session?.user?.name;
  const displayEmail = me.data?.email ?? session?.user?.email;
  const displayImage = me.data?.image ?? session?.user?.image;
  const initials = initialsFromName(displayName, displayEmail);
  const isAuthed = status === "authenticated" && !!session?.user;
  const showGuestNav = status === "unauthenticated";

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", onOutsideClick, true);
    }
    return () => document.removeEventListener("mousedown", onOutsideClick, true);
  }, [menuOpen]);

  return (
    <>
      <Head>
        <title>{title ? `${title} · Tasker` : "Tasker"}</title>
        <meta name="description" content="Task management & collaboration" />
      </Head>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="app-header shrink-0">
          <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href="/dashboard"
              className="flex min-w-0 shrink-0 items-center gap-2"
            >
              <div className="app-brand-mark grid h-8 w-8 shrink-0 place-items-center rounded-md text-sm font-bold">
                T
              </div>
              {!compactBrand && (
                <span className="truncate text-base font-semibold text-heading sm:text-lg">
                  Tasker
                </span>
              )}
              {headerTitle && (
                <span
                  className="flex min-w-0 items-center gap-2 border-l pl-3"
                  style={{ borderColor: "var(--nav-border)" }}
                >
                  <span className="truncate text-sm font-semibold text-heading sm:text-base">
                    {headerTitle}
                  </span>
                  <span className="app-badge inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide">
                    Project
                  </span>
                </span>
              )}
            </Link>

            {isAuthed && (
              <div className="flex min-w-0 shrink items-center gap-1 sm:gap-2 md:gap-3">
                <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1 md:overflow-visible">
                  {navItems.map((item) => {
                    const active = router.pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`app-nav-link shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
                          active ? "app-nav-link-active" : ""
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <NotificationsBell />
                <div className="relative shrink-0" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="app-nav-link flex shrink-0 items-center gap-1 rounded-md border border-transparent p-1 transition sm:gap-2 sm:px-1.5 sm:py-1"
                    aria-label="Open profile menu"
                    aria-expanded={menuOpen}
                  >
                    <span className="app-avatar grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold">
                      <CachedAvatar
                        src={displayImage}
                        alt={displayName ?? "Profile"}
                        className="h-full w-full object-cover"
                        fallback={initials}
                      />
                    </span>
                    <span className="hidden text-xs text-muted sm:inline">▾</span>
                  </button>
                  {menuOpen && (
                    <div className="app-dropdown absolute right-0 z-[60] mt-2 w-56 overflow-hidden rounded-md shadow-xl">
                      <div
                        className="border-b px-3 py-2"
                        style={{ borderColor: "var(--border-muted)" }}
                      >
                        <p className="text-sm font-semibold text-heading">
                          {displayName ?? "User"}
                        </p>
                        <p className="truncate text-xs text-muted">{displayEmail}</p>
                      </div>
                      <div className="p-1">
                        <Link
                          href="/profile"
                          className="app-dropdown-item block rounded-md px-3 py-2 text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link
                          href="/profile?tab=settings"
                          className="app-dropdown-item block rounded-md px-3 py-2 text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          Settings
                        </Link>
                        <Link
                          href="/profile?tab=security"
                          className="app-dropdown-item block rounded-md px-3 py-2 text-sm"
                          onClick={() => setMenuOpen(false)}
                        >
                          Security
                        </Link>
                      </div>
                      <div
                        className="border-t p-1"
                        style={{ borderColor: "var(--border-muted)" }}
                      >
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
            )}

            {showGuestNav && (
              <div className="flex items-center gap-2">
                <Link href="/auth/signin" className="btn-ghost">
                  Sign in
                </Link>
                <Link href="/auth/signup" className="btn-primary">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </header>

        <main
          className={
            contentClassName ??
            "mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
          }
        >
          {isAuthed && me.data && !me.data.companyName && (
            <div className="app-banner-warning mb-4 rounded-xl px-4 py-3 text-sm">
              Add your{" "}
              <Link href="/profile" className="font-semibold underline underline-offset-2">
                company name in Profile
              </Link>{" "}
              to search teammates and invite people from your organization.
            </div>
          )}
          {children}
        </main>
      </div>
    </>
  );
}
