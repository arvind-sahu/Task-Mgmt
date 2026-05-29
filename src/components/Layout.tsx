import { signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { NotificationsBell } from "~/components/NotificationsBell";
import { api } from "~/utils/api";
import { initialsFromName } from "~/utils/avatar";

interface LayoutProps {
  title?: string;
  children: ReactNode;
}

/**
 * App shell: top navigation + main content area. Used on every authenticated
 * page so the navigation experience is consistent. Auth pages render their
 * own minimal shell (see /auth/*).
 */
export default function Layout({ title, children }: LayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const me = api.user.me.useQuery(undefined, { enabled: !!session });
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
        <header className="shrink-0 border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href="/dashboard"
              className="flex min-w-0 shrink-0 items-center gap-2"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-indigo-600 text-sm font-bold text-white">
                T
              </div>
              <span className="truncate text-base font-semibold sm:text-lg">
                Tasker
              </span>
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
                        className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
                          active
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-100"
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
                    className="flex shrink-0 items-center gap-1 rounded-md border border-transparent p-1 transition hover:border-slate-300 hover:bg-slate-100 sm:gap-2 sm:px-1.5 sm:py-1"
                    aria-label="Open profile menu"
                    aria-expanded={menuOpen}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                      {displayImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayImage}
                          alt={displayName ?? "Profile"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </span>
                    <span className="hidden text-xs text-slate-500 sm:inline">
                      ▾
                    </span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 z-[60] mt-2 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {displayName ?? "User"}
                        </p>
                        <p className="truncate text-xs text-slate-500">{displayEmail}</p>
                      </div>
                      <div className="p-1">
                      <Link
                        href="/profile"
                        className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/profile?tab=settings"
                        className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <Link
                        href="/profile?tab=security"
                        className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Security
                      </Link>
                      </div>
                      <div className="border-t border-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
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

        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </>
  );
}
