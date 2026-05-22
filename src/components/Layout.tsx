import { signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

      <div className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-indigo-600 text-sm font-bold text-white">
                T
              </div>
              <span className="text-lg font-semibold">Tasker</span>
            </Link>

            {isAuthed && (
              <div className="flex items-center gap-3">
                <nav className="flex items-center gap-1">
                  {navItems.map((item) => {
                    const active = router.pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
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
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1 transition hover:border-slate-300 hover:bg-slate-100"
                    aria-label="Open profile menu"
                    aria-expanded={menuOpen}
                  >
                    <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
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
                    <span className="text-xs text-slate-500">▾</span>
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

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </>
  );
}
