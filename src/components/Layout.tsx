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

            {session && (
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
                    className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200"
                    aria-label="Open profile menu"
                    aria-expanded={menuOpen}
                  >
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
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 z-[60] mt-2 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
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
                      <button
                        type="button"
                        onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!session && status !== "loading" && (
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
