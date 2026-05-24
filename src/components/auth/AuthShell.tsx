import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="auth-shell relative min-h-screen overflow-hidden text-slate-950">
      <header className="relative z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-600/25">
              T
            </span>
            <span className="text-xl font-black tracking-tight">Tasker</span>
          </Link>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="hidden rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-slate-500 md:inline">
              EN
            </span>
            <Link href="/contact" className="hidden text-slate-600 transition hover:text-blue-600 sm:inline">
              Contact support
            </Link>
            <Link href="/" className="brand-button-secondary h-10 px-4">
              Back home
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-126px)] max-w-7xl items-center gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[0.82fr_1fr]">
        <aside className="hidden lg:block">
          <div className="mb-6 max-w-xl">
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight xl:text-5xl">
              Welcome back to Tasker.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Your product delivery command center is protected with enterprise-grade
              authentication, encrypted sessions, and secure team access.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-blue-200">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/25 blur-3xl" />
            <div className="absolute -bottom-12 left-8 h-36 w-36 rounded-full bg-purple-500/25 blur-3xl" />
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-[1.75rem] bg-white text-3xl font-black text-blue-600 shadow-2xl shadow-blue-500/20">
                T
              </div>
              <blockquote className="mt-8 text-xl font-black leading-8">
                "Tasker keeps our delivery work organized without slowing the team down."
              </blockquote>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Priya Sharma, VP Product at Northstar Tech
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {["5,000+ teams", "256-bit encryption"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-sm font-black text-cyan-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {["SOC2 ready", "GDPR aligned", "99.9% uptime"].map((badge) => (
              <div
                key={badge}
                className="rounded-2xl border border-white/70 bg-white/75 p-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-600 shadow-sm backdrop-blur"
              >
                {badge}
              </div>
            ))}
          </div>
        </aside>

        <section className="auth-panel-enter mx-auto w-full max-w-xl">
          <div className="mb-5 text-center lg:text-left">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-lg font-black text-white shadow-xl shadow-blue-500/25 lg:mx-0">
              T
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>

          {children}
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/70 bg-white/65 px-5 py-3 text-sm text-slate-500 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row">
          <p>© 2026 Tasker. All rights reserved.</p>
          <p>Privacy Policy · Terms of Service · hello@tasker.example</p>
        </div>
      </footer>
    </div>
  );
}
