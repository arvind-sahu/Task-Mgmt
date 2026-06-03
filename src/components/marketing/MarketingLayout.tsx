import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef, type ReactNode } from "react";

import { trackMarketingEvent } from "~/lib/analytics";
import { navLinks } from "~/components/marketing/data";
import { HomeSkyBackdrop } from "~/components/marketing/HomeSkyBackdrop";
import { HomeTimeThemeControl } from "~/components/marketing/HomeTimeThemeControl";
import { useHomeTimeTheme } from "~/contexts/homeTimeTheme";
import { subscribeMarketingScroll, getMarketingScrollProgress } from "~/utils/marketingScroll";
import type { HomeTimeThemeSlot } from "~/utils/homeTimeTheme";

interface MarketingLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  enableTimeTheme?: boolean;
}

const footerSections = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/team", label: "Team" },
      { href: "/about#careers", label: "Careers" },
      { href: "/blog", label: "Case studies" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/features", label: "Web development" },
      { href: "/features#ai", label: "AI integration" },
      { href: "/features#analytics", label: "Analytics" },
      { href: "/features#security", label: "Security" },
    ],
  },
  {
    title: "Engagement",
    links: [
      { href: "/contact", label: "Dedicated teams" },
      { href: "/contact", label: "Project delivery" },
      { href: "/contact", label: "Consulting" },
      { href: "/contact", label: "Support retainers" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/vs-jira", label: "Tasker vs Jira" },
      { href: "/pricing#faq", label: "FAQ" },
      { href: "/contact", label: "Contact sales" },
    ],
  },
];

export function MarketingLayout({
  title,
  description,
  children,
  enableTimeTheme = false,
}: MarketingLayoutProps) {
  if (enableTimeTheme) {
    return (
      <TimeThemedMarketingLayout title={title} description={description}>
        {children}
      </TimeThemedMarketingLayout>
    );
  }

  return (
    <MarketingLayoutShell title={title} description={description}>
      {children}
    </MarketingLayoutShell>
  );
}

function TimeThemedMarketingLayout({
  title,
  description,
  children,
}: Omit<MarketingLayoutProps, "enableTimeTheme">) {
  const { theme } = useHomeTimeTheme();

  return (
    <MarketingLayoutShell
      title={title}
      description={description}
      timeTheme={theme}
    >
      {children}
      <HomeTimeThemeControl />
    </MarketingLayoutShell>
  );
}

function MarketingLayoutShell({
  title,
  description,
  children,
  timeTheme,
}: Omit<MarketingLayoutProps, "enableTimeTheme"> & {
  timeTheme?: HomeTimeThemeSlot;
}) {
  const { data: session } = useSession();
  const appHref = session ? "/dashboard" : "/auth/signin";
  const progressRef = useRef<HTMLDivElement>(null);
  const timeThemed = Boolean(timeTheme);

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Tasker",
    applicationCategory: "ProjectManagementApplication",
    operatingSystem: "Web",
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;

    return subscribeMarketingScroll(() => {
      bar.style.transform = `scaleX(${getMarketingScrollProgress()})`;
    });
  }, []);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </Head>

      <div
        className={
          timeThemed
            ? "home-time-theme min-h-screen overflow-x-clip"
            : "min-h-screen overflow-x-clip bg-slate-950 text-white"
        }
        data-home-theme={timeTheme}
      >
        {timeThemed && timeTheme ? <HomeSkyBackdrop theme={timeTheme} /> : null}
        <div
          className={
            timeThemed
              ? "fixed inset-x-0 top-0 z-[70] h-1 bg-black/10"
              : "fixed inset-x-0 top-0 z-[70] h-1 bg-slate-950/20"
          }
        >
          <div
            ref={progressRef}
            className={
              timeThemed
                ? "home-time-progress marketing-progress h-full"
                : "marketing-progress h-full bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-600"
            }
            style={{ transform: "scaleX(0)" }}
          />
        </div>
        <header
          className={
            timeThemed
              ? "home-time-header sticky top-0 z-50 border-b"
              : "sticky top-0 z-50 border-b border-white/10 bg-slate-950/82 backdrop-blur-xl"
          }
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span
                className={
                  timeThemed
                    ? "home-time-brand-mark grid h-10 w-10 place-items-center rounded-2xl text-lg font-black"
                    : "grid h-10 w-10 place-items-center rounded-2xl bg-white text-lg font-black text-blue-600 shadow-2xl shadow-blue-500/25"
                }
              >
                T
              </span>
              <span className="text-xl font-black tracking-tight">Tasker</span>
            </Link>

            <nav
              className={
                timeThemed
                  ? "hidden items-center gap-7 text-sm font-semibold lg:flex"
                  : "hidden items-center gap-7 text-sm font-semibold text-slate-300 lg:flex"
              }
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    timeThemed
                      ? "home-time-nav-link transition"
                      : "transition hover:text-white"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href={appHref}
                className={
                  timeThemed
                    ? "home-time-btn-secondary rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5"
                    : "rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/90 transition hover:bg-white/10"
                }
              >
                {session ? "Dashboard" : "Sign in"}
              </Link>
              <Link
                href="/auth/signup"
                onClick={() =>
                  trackMarketingEvent("cta_click", {
                    location: "header",
                    label: "Start free",
                  })
                }
                className={
                  timeThemed
                    ? "home-time-btn-primary rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5"
                    : "rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
                }
              >
                Start free
              </Link>
            </div>
          </div>
        </header>

        <div className="marketing-page">{children}</div>

        <footer
          className={
            timeThemed
              ? "home-time-footer px-5 py-16 sm:px-8"
              : "bg-slate-950 px-5 py-16 text-slate-300 sm:px-8"
          }
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      timeThemed
                        ? "home-time-brand-mark grid h-11 w-11 place-items-center rounded-2xl text-lg font-black"
                        : "grid h-11 w-11 place-items-center rounded-2xl bg-white text-lg font-black text-blue-600"
                    }
                  >
                    T
                  </span>
                  <span className="text-2xl font-black">Tasker</span>
                </div>
                <p
                  className={
                    timeThemed
                      ? "mt-5 max-w-xl text-sm leading-7 opacity-80"
                      : "mt-5 max-w-xl text-sm leading-7 text-slate-400"
                  }
                >
                  Tasker is a modern project management platform and delivery company
                  helping teams plan, build, automate, and scale full-stack products
                  with AI-enabled workflows.
                </p>
                <div
                  className={
                    timeThemed
                      ? "mt-6 rounded-2xl border p-5 opacity-90"
                      : "mt-6 rounded-2xl border border-white/10 bg-white/5 p-5"
                  }
                  style={
                    timeThemed
                      ? { borderColor: "var(--ht-header-border)" }
                      : undefined
                  }
                >
                  <p className="text-sm font-black">Address</p>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    BTM Layout Bengaluru, Karnataka, India
                  </p>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    hello@tasker.example · +91 93258 60577
                  </p>
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                {footerSections.map((section) => (
                  <div key={section.title}>
                    <h3 className="font-black">{section.title}</h3>
                    <ul className="mt-4 space-y-3 text-sm">
                      {section.links.map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            className={
                              timeThemed
                                ? "home-time-nav-link transition"
                                : "transition hover:text-white"
                            }
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={
                timeThemed
                  ? "mt-12 flex flex-col justify-between gap-4 border-t pt-8 text-sm opacity-70 md:flex-row"
                  : "mt-12 flex flex-col justify-between gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 md:flex-row"
              }
              style={
                timeThemed ? { borderColor: "var(--ht-header-border)" } : undefined
              }
            >
              <p>© 2026 Tasker. All rights reserved.</p>
              <p>Privacy · Terms · Security · Accessibility · GDPR</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
