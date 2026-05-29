import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, type ReactNode } from "react";

import { trackMarketingEvent } from "~/lib/analytics";
import { navLinks } from "~/components/marketing/data";

interface MarketingLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

const footerSections = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
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

export function MarketingLayout({ title, description, children }: MarketingLayoutProps) {
  const { data: session } = useSession();
  const appHref = session ? "/dashboard" : "/auth/signin";
  const [scrollProgress, setScrollProgress] = useState(0);

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
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
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

      <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="fixed inset-x-0 top-0 z-[70] h-1 bg-slate-950/20">
          <div
            className="marketing-progress h-full bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-600"
            style={{ transform: `scaleX(${scrollProgress})` }}
          />
        </div>
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/82 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-lg font-black text-blue-600 shadow-2xl shadow-blue-500/25">
                T
              </span>
              <span className="text-xl font-black tracking-tight">Tasker</span>
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 lg:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href={appHref}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/90 transition hover:bg-white/10"
              >
                {session ? "Dashboard" : "Sign in"}
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => trackMarketingEvent("cta_click", { location: "header", label: "Start free" })}
                className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Start free
              </Link>
            </div>
          </div>
        </header>

        <div className="marketing-page">{children}</div>

        <footer className="bg-slate-950 px-5 py-16 text-slate-300 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-lg font-black text-blue-600">
                    T
                  </span>
                  <span className="text-2xl font-black text-white">Tasker</span>
                </div>
                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
                  Tasker is a modern project management platform and delivery company
                  helping teams plan, build, automate, and scale full-stack products
                  with AI-enabled workflows.
                </p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-black text-white">Address</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    BTM Layout Bengaluru, Karnataka, India
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    hello@tasker.example · +91 93258 60577
                  </p>
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                {footerSections.map((section) => (
                  <div key={section.title}>
                    <h3 className="font-black text-white">{section.title}</h3>
                    <ul className="mt-4 space-y-3 text-sm">
                      {section.links.map((link) => (
                        <li key={link.label}>
                          <Link href={link.href} className="transition hover:text-white">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 flex flex-col justify-between gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 md:flex-row">
              <p>© 2026 Tasker. All rights reserved.</p>
              <p>Privacy · Terms · Security · Accessibility · GDPR</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
