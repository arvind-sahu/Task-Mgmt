import { signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactNode } from "react";

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

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/profile", label: "Profile" },
  ];

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
                <button
                  onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                  className="ml-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Sign out
                </button>
              </nav>
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
