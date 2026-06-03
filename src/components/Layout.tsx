import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, type ReactNode } from "react";

import { AppSidebar } from "~/components/app/AppSidebar";
import { AppTopBar } from "~/components/app/AppTopBar";
import { type ProjectTab } from "~/config/appNav";
import { useSidebarState } from "~/hooks/useSidebarState";
import { api } from "~/utils/api";

interface LayoutProps {
  title?: string;
  children: ReactNode;
  contentClassName?: string;
  headerTitle?: string;
  projectColor?: string;
  projectTabs?: ProjectTab[];
}

/**
 * App shell: collapsible sidebar + top bar + main content.
 * Auth pages use AuthShell instead.
 */
export default function Layout({
  title,
  children,
  contentClassName,
  headerTitle,
  projectColor,
  projectTabs,
}: LayoutProps) {
  const { data: session, status } = useSession();
  const me = api.user.me.useQuery(undefined, {
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
  const { collapsed, mobileOpen, toggleCollapsed, openMobile, closeMobile } =
    useSidebarState();
  const router = useRouter();

  useEffect(() => {
    closeMobile();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [router.pathname, router.asPath, closeMobile]);

  const isAuthed = status === "authenticated" && !!session?.user;
  const showGuestNav = status === "unauthenticated";

  return (
    <>
      <Head>
        <title>{title ? `${title} · Tasker` : "Tasker"}</title>
        <meta name="description" content="Task management & collaboration" />
      </Head>

      <div className="app-shell flex h-screen min-h-0 overflow-hidden">
        {isAuthed && (
          <AppSidebar
            collapsed={collapsed}
            mobileOpen={mobileOpen}
            onToggleCollapsed={toggleCollapsed}
            onCloseMobile={closeMobile}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {isAuthed ? (
            <AppTopBar
              headerTitle={headerTitle}
              projectColor={projectColor}
              projectTabs={projectTabs}
              onOpenMobileMenu={openMobile}
              onCloseMobileMenu={closeMobile}
            />
          ) : (
            <header className="app-header shrink-0">
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
                <Link href="/" className="flex items-center gap-2">
                  <div className="app-brand-mark grid h-8 w-8 place-items-center rounded-md text-sm font-bold">
                    T
                  </div>
                  <span className="text-base font-semibold text-heading sm:text-lg">Tasker</span>
                </Link>
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
          )}

          <main
            className={
              contentClassName ??
              "app-main relative z-0 mx-auto w-full min-w-0 max-w-[1600px] flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 lg:px-6"
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
      </div>
    </>
  );
}
