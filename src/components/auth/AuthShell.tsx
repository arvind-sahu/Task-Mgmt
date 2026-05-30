import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  compact?: boolean;
  titleHelp?: ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  children,
  compact = false,
  titleHelp,
}: AuthShellProps) {
  const shellClassName = compact
    ? "auth-shell relative grid h-screen grid-rows-[auto_1fr_auto] overflow-hidden text-slate-950"
    : "auth-shell relative min-h-screen overflow-hidden text-slate-950";
  const headerInnerClassName = compact
    ? "mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6"
    : "mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8";
  const mainClassName = compact
    ? "relative z-10 mx-auto grid min-h-0 w-full max-w-7xl items-center gap-5 px-4 py-3 sm:px-6 lg:grid-cols-[0.76fr_1fr]"
    : "relative z-10 mx-auto grid min-h-[calc(100vh-126px)] max-w-7xl items-center gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[0.82fr_1fr]";
  const heroCardClassName = compact
    ? "relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-blue-200"
    : "relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-blue-200";
  const panelIntroClassName = compact
    ? "mb-3 text-center lg:text-left"
    : "mb-5 text-center lg:text-left";

  return (
    <div className={shellClassName}>
      <header className="relative z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className={headerInnerClassName}>
          <Link href="/" className="flex items-center gap-3">
            <span
              className={`${compact ? "h-9 w-9 rounded-xl text-base" : "h-10 w-10 rounded-2xl text-lg"} grid place-items-center bg-blue-600 font-black text-white shadow-lg shadow-blue-600/25`}
            >
              T
            </span>
            <span className="text-xl font-black tracking-tight">Tasker</span>
          </Link>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="hidden rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-slate-500 md:inline">
              EN
            </span>
            <Link
              href="/contact"
              className="hidden text-slate-600 transition hover:text-blue-600 sm:inline"
            >
              Contact support
            </Link>
            <Link href="/" className="brand-button-secondary h-10 px-4">
              Back home
            </Link>
          </div>
        </div>
      </header>

      <main className={mainClassName}>
        <aside className="hidden lg:block">
          <div className={`${compact ? "mb-4" : "mb-6"} max-w-xl`}>
            <h1
              className={`${compact ? "text-3xl xl:text-4xl" : "mt-3 text-4xl xl:text-5xl"} font-black leading-tight tracking-tight`}
            >
              Welcome back to Tasker.
            </h1>
            <p
              className={`${compact ? "mt-3 text-sm leading-6" : "mt-4 text-base leading-7"} text-slate-600`}
            >
              Your product delivery command center is protected with
              enterprise-grade authentication, encrypted sessions, and secure
              team access.
            </p>
          </div>

          <div className={heroCardClassName}>
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/25 blur-3xl" />
            <div className="absolute -bottom-12 left-8 h-36 w-36 rounded-full bg-purple-500/25 blur-3xl" />
            <div className="relative">
              <div
                className={`${compact ? "h-16 w-16 rounded-3xl text-2xl" : "h-20 w-20 rounded-[1.75rem] text-3xl"} grid place-items-center bg-white font-black text-blue-600 shadow-2xl shadow-blue-500/20`}
              >
                T
              </div>
              <blockquote
                className={`${compact ? "mt-5 text-lg leading-7" : "mt-8 text-xl leading-8"} font-black`}
              >
                "Tasker keeps our delivery work organized without slowing the
                team down."
              </blockquote>
              <p
                className={`${compact ? "mt-3" : "mt-4"} text-sm leading-6 text-slate-300`}
              >
                Priya Sharma, VP Product at Northstar Tech
              </p>
              <div
                className={`${compact ? "mt-4" : "mt-6"} grid grid-cols-2 gap-3`}
              >
                {["5,000+ teams", "256-bit encryption"].map((item) => (
                  <div
                    key={item}
                    className={`${compact ? "p-3" : "p-4"} rounded-2xl border border-white/10 bg-white/10`}
                  >
                    <p className="text-sm font-black text-cyan-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`${compact ? "mt-3" : "mt-4"} grid grid-cols-3 gap-3`}
          >
            {["SOC2 ready", "GDPR aligned", "99.9% uptime"].map((badge) => (
              <div
                key={badge}
                className={`${compact ? "p-2" : "p-3"} rounded-2xl border border-white/70 bg-white/75 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-600 shadow-sm backdrop-blur`}
              >
                {badge}
              </div>
            ))}
          </div>
        </aside>

        <section
          className={`${compact ? "max-w-lg" : "max-w-xl"} auth-panel-enter mx-auto w-full`}
        >
          <div className={panelIntroClassName}>
            <div
              className={`${compact ? "mb-2 h-10 w-10 rounded-xl text-base" : "mb-3 h-12 w-12 rounded-2xl text-lg"} mx-auto grid place-items-center bg-gradient-to-br from-blue-600 to-purple-600 font-black text-white shadow-xl shadow-blue-500/25 lg:mx-0`}
            >
              T
            </div>
            <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between">
              <h2
                className={`${compact ? "text-2xl" : "text-3xl"} font-black tracking-tight text-slate-950`}
              >
                {title}
              </h2>
              {titleHelp}
            </div>
            <p
              className={`${compact ? "mt-1 leading-5" : "mt-2 leading-6"} text-sm text-slate-600`}
            >
              {subtitle}
            </p>
          </div>

          {children}
        </section>
      </main>

      <footer
        className={`${compact ? "px-4 py-2 text-xs sm:px-6" : "px-5 py-3 text-sm sm:px-8"} relative z-10 border-t border-white/70 bg-white/65 text-slate-500 backdrop-blur-xl`}
      >
        <div
          className={`${compact ? "gap-1" : "gap-3"} mx-auto flex max-w-7xl flex-col justify-between sm:flex-row`}
        >
          <p>© 2026 Tasker. All rights reserved.</p>
          <p>Privacy Policy · Terms of Service · hello@tasker.example</p>
        </div>
      </footer>
    </div>
  );
}
