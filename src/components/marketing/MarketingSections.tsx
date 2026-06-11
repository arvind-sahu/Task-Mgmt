import Link from "next/link";
import { useState, type FormEvent } from "react";

import { trackMarketingEvent } from "~/lib/analytics";
import { LeadershipTeamSection } from "~/components/team/TeamSection";
import {
  blogPosts,
  caseStudies,
  comparisonRows,
  customerLogos,
  engagementModels,
  featureCards,
  pricingFaqs,
  pricingPlans,
  productTourSteps,
  solutions,
  teamMembers,
  testimonials,
  trustStats,
  values,
} from "~/components/marketing/data";

export function SectionIntro({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="ht-section-eyebrow text-sm font-black uppercase tracking-[0.28em] text-blue-600">{eyebrow}</p>
      <h2 className="ht-section-title mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h2>
      <p className="ht-section-desc mt-5 text-lg leading-8 text-slate-600">{description}</p>
    </div>
  );
}

export function SectionDivider() {
  return <div className="section-divider" aria-hidden="true" />;
}

export function ProductMockup() {
  const columns = [
    { title: "Backlog", cards: ["AI task brief", "Role matrix", "Mobile polish"], color: "from-slate-800 to-slate-900" },
    { title: "In progress", cards: ["Sprint dashboard", "File uploads", "Smart alerts"], color: "from-blue-600/40 to-purple-600/30" },
    { title: "Done", cards: ["Auth flow", "Project roles", "Comments"], color: "from-emerald-500/30 to-cyan-500/20" },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-500/20 blur-2xl" />
      <div className="marketing-float relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-slate-950/60 backdrop-blur-xl">
        <div className="rounded-[1.5rem] bg-slate-950/90 p-4 ring-1 ring-white/10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Product sprint</p>
              <h2 className="mt-1 text-xl font-black text-white">AI workspace launch</h2>
            </div>
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 3).map((member) => (
                <span
                  key={member.initials}
                  className="grid h-9 w-9 place-items-center rounded-full border-2 border-slate-950 bg-gradient-to-br from-cyan-300 to-blue-500 text-xs font-black text-slate-950"
                >
                  {member.initials}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {columns.map((column, columnIndex) => (
              <div
                key={column.title}
                className={`rounded-2xl bg-gradient-to-b ${column.color} p-3 ring-1 ring-white/10`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{column.title}</p>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                    {column.cards.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {column.cards.map((card, cardIndex) => (
                    <div
                      key={card}
                      className="marketing-card rounded-xl border border-white/10 bg-white p-3 text-slate-900 shadow-xl"
                      style={{ animationDelay: `${columnIndex * 170 + cardIndex * 120}ms` }}
                    >
                      <div className="mb-3 h-2 w-16 rounded-full bg-gradient-to-r from-cyan-300 to-blue-500" />
                      <p className="text-sm font-black">{card}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>High priority</span>
                        <span>2d</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeHero({ timeThemed = false }: { timeThemed?: boolean }) {
  return (
    <section className="home-time-hero relative isolate">
      {!timeThemed && (
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.5),transparent_30%),radial-gradient(circle_at_78%_8%,rgba(124,58,237,0.35),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_72%,#f8fafc_72%,#f8fafc_100%)]" />
      )}
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:pb-28 lg:pt-20">
        <div className="max-w-3xl">
          <div
            className={
              timeThemed
                ? "home-time-hero-badge mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-2xl"
                : "mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-2xl shadow-cyan-950/40"
            }
          >
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
            Jira alternative with AI delivery support
          </div>
          <h1
            className={
              timeThemed
                ? "home-time-hero-title text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
                : "text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl"
            }
          >
            Your product delivery command center.
          </h1>
          <p
            className={
              timeThemed
                ? "home-time-hero-subtitle mt-6 max-w-2xl text-lg leading-8"
                : "mt-6 max-w-2xl text-lg leading-8 text-slate-300"
            }
          >
            Join 5,000+ teams using Tasker for sprint planning, AI insights,
            real-time collaboration, and end-to-end full-stack delivery support.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/auth/company-signup"
              onClick={() =>
                trackMarketingEvent("cta_click", {
                  location: "hero",
                  label: "Create company workspace",
                })
              }
              className={
                timeThemed
                  ? "home-time-btn-primary rounded-full px-7 py-3 text-center text-sm font-black transition hover:-translate-y-1"
                  : "rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 px-7 py-3 text-center text-sm font-black text-slate-950 shadow-2xl shadow-blue-500/30 transition hover:-translate-y-1"
              }
            >
              Create company workspace
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => trackMarketingEvent("cta_click", { location: "hero", label: "Start free" })}
              className={
                timeThemed
                  ? "home-time-btn-secondary rounded-full border px-7 py-3 text-center text-sm font-bold transition hover:-translate-y-1"
                  : "rounded-full border border-white/15 px-7 py-3 text-center text-sm font-bold text-white transition hover:-translate-y-1 hover:bg-white/10"
              }
            >
              Join as individual
            </Link>
            <a
              href="#demo"
              onClick={() => trackMarketingEvent("cta_click", { location: "hero", label: "Watch demo" })}
              className={
                timeThemed
                  ? "home-time-btn-secondary rounded-full border px-7 py-3 text-center text-sm font-bold transition hover:-translate-y-1"
                  : "rounded-full border border-white/15 px-7 py-3 text-center text-sm font-bold text-white transition hover:-translate-y-1 hover:bg-white/10"
              }
            >
              Watch demo
            </a>
          </div>
          <div
            className={
              timeThemed
                ? "mt-8 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em]"
                : "mt-8 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-200"
            }
          >
            {["GDPR compliant", "SOC2 Type II", "SSO ready", "99.9% uptime"].map((badge) => (
              <span
                key={badge}
                className={
                  timeThemed
                    ? "home-time-trust-badge rounded-full border px-3 py-2 shadow-lg backdrop-blur"
                    : "rounded-full border border-cyan-200/35 bg-slate-950/70 px-3 py-2 text-cyan-100 shadow-lg shadow-slate-950/30 backdrop-blur"
                }
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
        <ProductMockup />
      </div>
    </section>
  );
}

export function FeatureGrid({ detailed = false }: { detailed?: boolean }) {
  return (
    <section
      id="features"
      className="marketing-section marketing-section--after-hero marketing-section--bridge pattern-grid bg-slate-50 px-5 text-slate-950 sm:px-8"
    >
      <div className="relative mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Everything teams expect"
          title="Jira-inspired features with cleaner AI-first execution."
          description="From issue tracking to executive reporting, Tasker gives teams the structure to move fast and the clarity to stay aligned."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature, index) => (
            <article
              id={feature.title.toLowerCase().includes("ai") ? "ai" : feature.title.toLowerCase().includes("analytics") ? "analytics" : feature.title.toLowerCase().includes("security") ? "security" : undefined}
              key={feature.title}
              className="marketing-feature group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-100"
              style={{ animationDelay: `${index * 70}ms` }}
              onMouseEnter={() => trackMarketingEvent("feature_explored", { feature: feature.title })}
            >
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-black text-white shadow-lg shadow-blue-200 transition group-hover:rotate-6 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="text-lg font-black text-slate-950">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
              {detailed && (
                <ul className="mt-5 space-y-2 text-sm text-slate-700">
                  {feature.details.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/features" className="mt-5 inline-block text-sm font-black text-blue-600 hover:text-blue-700">
                Learn more
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InteractiveDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const currentStep = productTourSteps[activeStep] ?? {
    title: "Explore Tasker",
    description: "Walk through the core planning, collaboration, AI insight, and reporting workflow.",
  };

  return (
    <section id="demo" className="marketing-section bg-slate-100 px-5 text-slate-950 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <SectionIntro
            align="left"
            eyebrow="Interactive demo"
            title="Explore the product before login."
            description="A guided tour shows the core workflow without requiring users to create an account first."
          />
          <div className="mt-8 space-y-3">
            {productTourSteps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onClick={() => {
                  setActiveStep(index);
                  trackMarketingEvent("feature_explored", { step: step.title });
                }}
                className={`ht-step w-full rounded-2xl border p-4 text-left transition ${
                  activeStep === index ? "ht-step-active" : ""
                }`}
              >
                <p className="ht-step-title text-sm font-black">{index + 1}. {step.title}</p>
                <p className="mt-1 text-sm leading-6">{step.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="ht-demo-shell rounded-[2rem] p-5 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <p className="ht-demo-label text-sm font-black">Guided preview</p>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{activeStep + 1}/5</span>
          </div>
          <div className="ht-demo-inner relative min-h-[360px] overflow-hidden rounded-[1.5rem] p-5 ring-1 ring-white/10">
            <div className="absolute right-8 top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
            <div className="relative grid gap-4 md:grid-cols-[1fr_0.72fr]">
              <div className="space-y-3">
                {["Discovery", "Design", "Build", "Launch"].map((label, index) => (
                  <div
                    key={label}
                    className={`rounded-2xl border border-white/10 p-4 transition ${
                      index === activeStep % 4 ? "bg-white text-slate-950" : "bg-white/10 text-white"
                    }`}
                  >
                    <p className="text-sm font-black">{label}</p>
                    <div className="mt-3 h-2 rounded-full bg-current opacity-20" />
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-white p-5 text-slate-950 shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">AI insight</p>
                <h3 className="mt-3 text-xl font-black">{currentStep.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{currentStep.description}</p>
                <Link
                  href="/auth/signup"
                  className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white"
                >
                  Try it yourself
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SocialProof() {
  return (
    <section className="marketing-section pattern-diagonal bg-slate-50 px-5 text-slate-950 sm:px-8">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="ht-section-eyebrow text-sm font-black uppercase tracking-[0.28em] text-blue-600">
            Social proof
          </p>
          <h2 className="ht-section-title mt-4 text-4xl font-black tracking-tight text-slate-950">
            Trusted by 5,000+ product and engineering teams.
          </h2>
          <p className="ht-section-desc mt-4 text-base text-slate-600">
            Rated 4.8/5 by teams replacing scattered trackers with one delivery workspace.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trustStats.map((stat) => (
            <div key={stat.label} className="ht-stat-card rounded-3xl border p-6 text-center shadow-sm">
              <p className="text-4xl font-black" style={{ color: "var(--ht-accent)" }}>{stat.value}</p>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.16em] ht-panel-muted-text">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="ht-marquee-wrap mt-12 overflow-hidden rounded-3xl border p-5 shadow-sm">
          <div className="marketing-marquee flex min-w-max gap-4">
            {[...customerLogos, ...customerLogos].map((logo, index) => (
              <span
                key={`${logo}-${index}`}
                className="ht-logo-chip grid h-20 w-44 place-items-center rounded-2xl border text-sm font-black grayscale transition duration-300 hover:grayscale-0"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <blockquote key={testimonial.name} className="ht-quote-card rounded-3xl border p-6 shadow-sm">
              <p className="text-sm leading-7 ht-panel-muted-text">"{testimonial.quote}"</p>
              <footer className="mt-5">
                <p className="ht-quote-name font-black">{testimonial.name}</p>
                <p className="text-sm ht-panel-muted-text">{testimonial.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustSecuritySection() {
  const trustHighlights = [
    {
      title: "Encrypted by default",
      description:
        "Sensitive workspace data is protected with encrypted connections, secure sessions, and access controls designed for business-critical collaboration.",
    },
    {
      title: "Privacy-first governance",
      description:
        "Our handling practices are guided by European data protection principles, including purpose limitation, consent-aware workflows, and responsible retention.",
    },
    {
      title: "India-ready data practices",
      description:
        "We design our processes with India’s Digital Personal Data Protection expectations in mind, including transparency, accountability, and user trust.",
    },
  ];

  return (
    <section className="marketing-section ht-trust-section bg-slate-950 px-5 text-white sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="ht-section-eyebrow text-sm font-black uppercase tracking-[0.28em] text-cyan-200">
            Security and trust
          </p>
          <h2 className="ht-section-title mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Your data is treated like business-critical infrastructure.
          </h2>
          <p className="ht-section-desc mt-5 text-lg leading-8 text-slate-300">
            Tasker is built to protect customer information with encryption, controlled access,
            and privacy-aware operating practices inspired by leading European standards and
            India’s evolving data protection framework.
          </p>
        </div>

        <div className="grid gap-4">
          {trustHighlights.map((item) => (
            <article
              key={item.title}
              className="ht-spotlight-item rounded-3xl border p-6 shadow-2xl"
            >
              <div className="ht-spotlight-eyebrow mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em]">
                Trust layer
              </div>
              <h3 className="ht-spotlight-title text-xl font-black">{item.title}</h3>
              <p className="ht-spotlight-muted mt-3 text-sm leading-7">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingSection() {
  const [yearly, setYearly] = useState(true);
  const defaultFocusedIndex = Math.max(
    pricingPlans.findIndex((plan) => plan.popular),
    0,
  );
  const [focusedPlanIndex, setFocusedPlanIndex] = useState(defaultFocusedIndex);

  return (
    <section className="marketing-section bg-slate-100 px-5 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Pricing"
          title="Plans for every team size."
          description="Start free, then scale into AI-powered planning, automation, advanced security, and dedicated delivery support."
        />
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setYearly((current) => !current);
              trackMarketingEvent("pricing_toggle", { billing: yearly ? "monthly" : "yearly" });
            }}
            className="rounded-full bg-slate-100 p-1 text-sm font-black text-slate-700"
          >
            <span className={`inline-block rounded-full px-5 py-2 ${!yearly ? "bg-white shadow" : ""}`}>Monthly</span>
            <span className={`inline-block rounded-full px-5 py-2 ${yearly ? "bg-blue-600 text-white shadow" : ""}`}>
              Yearly - save 17%
            </span>
          </button>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {pricingPlans.map((plan, index) => {
            const price = plan.priceMonthly === null ? null : yearly ? Math.round(plan.priceMonthly * 10) : plan.priceMonthly;
            const isFocused = focusedPlanIndex === index;
            return (
              <article
                key={plan.name}
                onMouseEnter={() => setFocusedPlanIndex(index)}
                onFocus={() => setFocusedPlanIndex(index)}
                tabIndex={0}
                className={`ht-pricing-card relative rounded-[2rem] border p-6 shadow-sm outline-none ${
                  isFocused ? "ht-pricing-card-active" : ""
                }`}
              >
                {plan.popular && (
                  <span className="absolute right-5 top-5 rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-slate-950">
                    Most popular
                  </span>
                )}
                <h3 className="ht-pricing-name text-2xl font-black">{plan.name}</h3>
                <p className="ht-pricing-desc mt-3 min-h-[72px] text-sm leading-6">
                  {plan.description}
                </p>
                <div className="mt-6">
                  {price === null ? (
                    <p className="text-4xl font-black">Custom</p>
                  ) : (
                    <p className="text-4xl font-black">
                      ${price}
                      <span className="ht-pricing-desc text-sm font-bold">/{yearly ? "user/year" : "user/month"}</span>
                    </p>
                  )}
                </div>
                <Link
                  href={plan.href}
                  onClick={() => trackMarketingEvent(plan.name === "Enterprise" ? "contact_sales" : "cta_click", { plan: plan.name })}
                  className={`mt-6 block rounded-full px-5 py-3 text-center text-sm font-black transition hover:-translate-y-1 ${
                    isFocused ? "ht-btn-solid" : "ht-btn-solid opacity-90"
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <p className="mt-8 text-center text-sm font-bold ht-panel-muted-text">
          Includes a money-back guarantee for paid plans.
        </p>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="marketing-section pattern-dots bg-slate-50 px-5 text-slate-950 sm:px-8">
      <div className="relative mx-auto max-w-4xl">
        <SectionIntro
          eyebrow="FAQ"
          title="Questions before you start?"
          description="Clear answers for teams comparing Tasker with traditional project management platforms."
        />
        <div className="mt-10 space-y-4">
          {pricingFaqs.map((item) => (
            <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer text-base font-black text-slate-950">{item.question}</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TeamSection() {
  return <LeadershipTeamSection timeThemed />;
}

export function SolutionsSection() {
  return (
    <section className="marketing-section bg-slate-100 px-5 text-slate-950 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionIntro
          align="left"
          eyebrow="End-to-end delivery company"
          title="We deliver the product, not just the tickets."
          description="Our team can take an idea from discovery to design, engineering, AI integration, launch, and continuous improvement."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {solutions.map((solution) => (
            <div key={solution} className="ht-solution-card rounded-3xl border p-6 shadow-sm">
              <span className="mb-5 block h-1.5 w-16 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600" />
              <h3 className="ht-solution-title text-lg font-black">{solution}</h3>
              <p className="mt-3 text-sm leading-6 ht-panel-muted-text">
                Strategy, UX, engineering, automation, deployment, and support delivered by one accountable team.
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="ht-spotlight-strip mx-auto mt-14 max-w-7xl rounded-[2rem] border p-8 shadow-2xl">
        <div className="grid gap-6 md:grid-cols-4">
          {engagementModels.map((model) => (
            <div key={model} className="ht-spotlight-item rounded-2xl border p-5">
              <p className="ht-spotlight-eyebrow text-sm font-black">{model}</p>
              <p className="ht-spotlight-muted mt-3 text-sm leading-6">
                Flexible delivery model built around your timeline, team, budget, and product maturity.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlogGrid() {
  return (
    <section className="marketing-section pattern-grid bg-slate-50 px-5 text-slate-950 sm:px-8">
      <div className="relative mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Resources"
          title="Guides for smarter project delivery."
          description="Practical articles, comparisons, trends, case studies, API guides, and security best practices."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <article key={post.slug} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-100">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{post.category}</p>
              <h3 className="mt-4 text-2xl font-black">{post.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
              <p className="mt-5 text-sm font-bold text-slate-500">{post.readTime}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CaseStudies() {
  return (
    <section className="marketing-section bg-slate-100 px-5 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Case studies"
          title="Real outcomes for product teams."
          description="Examples of how teams use Tasker to reduce coordination overhead and ship more predictably."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {caseStudies.map((study) => (
            <article key={study.company} className="ht-spotlight-card rounded-[2rem] border p-6 shadow-2xl">
              <p className="ht-spotlight-eyebrow text-sm font-black">{study.company}</p>
              <h3 className="ht-spotlight-title mt-4 text-2xl font-black">{study.title}</h3>
              <p className="mt-4 rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-black text-emerald-200">
                {study.result}
              </p>
              <p className="ht-spotlight-muted mt-5 text-sm leading-7">{study.summary}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LeadCaptureForms({ mode = "all" }: { mode?: "all" | "contact" }) {
  const [submitted, setSubmitted] = useState<{ type: "newsletter_signup" | "demo_request" | "contact_sales"; requestId: string } | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [demoForm, setDemoForm] = useState({
    fullName: "",
    workEmail: "",
    companyRole: "",
    message: "",
  });
  const [salesForm, setSalesForm] = useState({
    fullName: "",
    workEmail: "",
    companyRole: "",
    companySize: "business",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createLeadRequest = async (payload: {
    type: "DEMO_REQUEST" | "CONTACT_SALES" | "NEWSLETTER_SIGNUP";
    fullName?: string;
    workEmail: string;
    companyRole?: string;
    companySize?: string;
    message?: string;
    source?: string;
  }) => {
    const response = await fetch("/api/lead-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { requestId?: string; error?: string };
    if (!response.ok || !data.requestId) {
      throw new Error(data.error || "Unable to submit your request right now. Please try again.");
    }
    return data;
  };

  const handleDemoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackMarketingEvent("demo_request", { source: "marketing_form" });
    setIsSubmitting(true);
    void createLeadRequest({
        type: "DEMO_REQUEST",
        fullName: demoForm.fullName,
        workEmail: demoForm.workEmail,
        companyRole: demoForm.companyRole,
        message: demoForm.message,
        source: "marketing-form-demo",
      })
      .then(({ requestId }) => {
        setSubmitted({ type: "demo_request", requestId });
        setSubmissionError(null);
        setDemoForm({ fullName: "", workEmail: "", companyRole: "", message: "" });
      })
      .catch((error: unknown) => {
        setSubmissionError(
          error instanceof Error
            ? error.message
            : "Unable to submit your request right now. Please try again.",
        );
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackMarketingEvent("newsletter_signup", { source: "marketing_form" });
    setIsSubmitting(true);
    void createLeadRequest({
        type: "NEWSLETTER_SIGNUP",
        workEmail: newsletterEmail,
        source: "marketing-form-newsletter",
      })
      .then(({ requestId }) => {
        setSubmitted({ type: "newsletter_signup", requestId });
        setSubmissionError(null);
        setNewsletterEmail("");
      })
      .catch((error: unknown) => {
        setSubmissionError(
          error instanceof Error
            ? error.message
            : "Unable to submit your request right now. Please try again.",
        );
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleSalesSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackMarketingEvent("contact_sales", { source: "marketing_form" });
    setIsSubmitting(true);
    void createLeadRequest({
        type: "CONTACT_SALES",
        fullName: salesForm.fullName,
        workEmail: salesForm.workEmail,
        companyRole: salesForm.companyRole,
        companySize: salesForm.companySize,
        message: salesForm.message,
        source: "marketing-form-sales",
      })
      .then(({ requestId }) => {
        setSubmitted({ type: "contact_sales", requestId });
        setSubmissionError(null);
        setSalesForm({
          fullName: "",
          workEmail: "",
          companyRole: "",
          companySize: "business",
          message: "",
        });
      })
      .catch((error: unknown) => {
        setSubmissionError(
          error instanceof Error
            ? error.message
            : "Unable to submit your request right now. Please try again.",
        );
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <section className="marketing-section bg-slate-50 px-5 text-slate-950 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
        <div className="ht-spotlight-panel rounded-[2rem] border p-8 shadow-2xl">
          <p className="ht-spotlight-eyebrow text-sm font-black uppercase tracking-[0.28em]">Lead capture</p>
          <h2 className="ht-spotlight-title mt-4 text-4xl font-black">Book a demo or talk to sales.</h2>
          <p className="ht-spotlight-muted mt-5 text-sm leading-7">
            Tell us about your team, use case, and delivery goals. We will follow up with a tailored plan,
            pricing recommendation, and implementation roadmap.
          </p>
          <form className="mt-8 grid gap-4" onSubmit={handleDemoSubmit}>
            <input
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-300"
              placeholder="Full name"
              required
              value={demoForm.fullName}
              onChange={(event) => setDemoForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
            <input
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-300"
              type="email"
              placeholder="Work email"
              required
              value={demoForm.workEmail}
              onChange={(event) => setDemoForm((prev) => ({ ...prev, workEmail: event.target.value }))}
            />
            <input
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-300"
              placeholder="Company and role"
              required
              value={demoForm.companyRole}
              onChange={(event) => setDemoForm((prev) => ({ ...prev, companyRole: event.target.value }))}
            />
            <textarea
              className="min-h-28 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-300"
              placeholder="What do you want to build or improve?"
              value={demoForm.message}
              onChange={(event) => setDemoForm((prev) => ({ ...prev, message: event.target.value }))}
            />
            <button className="rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Request demo"}
            </button>
          </form>
        </div>

        <div className="grid gap-6">
          {mode === "all" && (
            <form className="ht-panel-muted rounded-[2rem] border p-8 shadow-sm" onSubmit={handleNewsletterSubmit}>
              <h3 className="text-2xl font-black">Get the free AI project checklist.</h3>
              <p className="mt-3 text-sm leading-6 ht-panel-muted-text">
                Join the newsletter for project management playbooks, AI workflow ideas, and delivery templates.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  className="ht-input min-w-0 flex-1 rounded-full border px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  type="email"
                  placeholder="Email address"
                  required
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                />
                <button className="ht-btn-solid rounded-full px-6 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Subscribe"}
                </button>
              </div>
            </form>
          )}

          <form className="ht-panel rounded-[2rem] border p-8 shadow-sm" onSubmit={handleSalesSubmit}>
            <h3 className="text-2xl font-black">Contact sales</h3>
            <p className="mt-3 text-sm leading-6 ht-panel-muted-text">
              Need enterprise security, SSO, procurement, or delivery services? Send requirements and we will respond.
            </p>
            <div className="mt-6 grid gap-3">
              <input
                className="ht-input rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full name"
                required
                value={salesForm.fullName}
                onChange={(event) => setSalesForm((prev) => ({ ...prev, fullName: event.target.value }))}
              />
              <input
                className="ht-input rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                type="email"
                placeholder="Work email"
                required
                value={salesForm.workEmail}
                onChange={(event) => setSalesForm((prev) => ({ ...prev, workEmail: event.target.value }))}
              />
              <input
                className="ht-input rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company and role"
                required
                value={salesForm.companyRole}
                onChange={(event) => setSalesForm((prev) => ({ ...prev, companyRole: event.target.value }))}
              />
              <select
                className="ht-select rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={salesForm.companySize}
                onChange={(event) => setSalesForm((prev) => ({ ...prev, companySize: event.target.value }))}
              >
                <option value="startup">Startup</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <textarea
                className="ht-textarea min-h-24 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us your requirement"
                value={salesForm.message}
                onChange={(event) => setSalesForm((prev) => ({ ...prev, message: event.target.value }))}
              />
              <button className="ht-btn-accent rounded-full px-6 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Send requirements"}
              </button>
            </div>
          </form>

          {submitted && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
              Thanks. Your {submitted.type.replace("_", " ")} request was captured with request id #{submitted.requestId}.
            </div>
          )}
          {submissionError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              {submissionError}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function RoiCalculator() {
  const [teamSize, setTeamSize] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(60);
  const [hoursSaved, setHoursSaved] = useState(3);
  const monthlySavings = teamSize * hourlyRate * hoursSaved * 4;

  return (
    <section className="marketing-section pattern-dots bg-slate-50 px-5 text-slate-950 sm:px-8">
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionIntro
          align="left"
          eyebrow="ROI calculator"
          title="Estimate the time your team can recover."
          description="Use a simple model to show visitors the business case for fewer status meetings and cleaner workflow automation."
        />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { label: "Team size", value: teamSize, setter: setTeamSize, min: 1, max: 250 },
              { label: "Hourly rate", value: hourlyRate, setter: setHourlyRate, min: 10, max: 250 },
              { label: "Hours saved/week", value: hoursSaved, setter: setHoursSaved, min: 1, max: 20 },
            ].map((input) => (
              <label key={input.label} className="text-sm font-black text-slate-700">
                {input.label}
                <input
                  type="number"
                  min={input.min}
                  max={input.max}
                  value={input.value}
                  onChange={(event) => input.setter(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
          <div className="mt-8 rounded-[2rem] bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">Estimated monthly savings</p>
            <p className="mt-3 text-5xl font-black">${monthlySavings.toLocaleString()}</p>
            <button
              type="button"
              onClick={() => trackMarketingEvent("roi_calculated", { teamSize, hourlyRate, hoursSaved, monthlySavings })}
              className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950"
            >
              See your personalized plan
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ComparisonMatrix() {
  return (
    <section className="marketing-section bg-slate-100 px-5 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Tasker vs Jira"
          title="Agile depth with a cleaner AI-first operating model."
          description="A practical comparison for teams evaluating price, onboarding speed, AI workflows, support, and delivery services."
        />
        <div className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-100">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1.4fr] bg-slate-950 px-5 py-4 text-sm font-black text-white">
            <span>Metric</span>
            <span>Tasker</span>
            <span>Jira</span>
            <span>Why it matters</span>
          </div>
          {comparisonRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1.4fr] gap-3 border-t border-slate-200 px-5 py-4 text-sm">
              <span className="font-black">{row.label}</span>
              <span className="font-bold text-emerald-700">{row.tasker}</span>
              <span className="text-slate-600">{row.jira}</span>
              <span className="text-slate-600">{row.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutStory() {
  return (
    <section className="marketing-section bg-slate-100 px-5 text-slate-950 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionIntro
          align="left"
          eyebrow="Company story"
          title="Built for teams who need delivery clarity."
          description="Tasker started with a simple belief: project management should make work clearer, not heavier. We combine a modern SaaS product with hands-on full-stack and AI delivery expertise so companies can plan, build, launch, and scale in one partnership."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((value) => (
            <div key={value} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <p className="text-lg font-black">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Office locations</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {["New Delhi", "Bengaluru", "Remote worldwide"].map((location) => (
            <div key={location} className="rounded-2xl bg-white p-5 font-black shadow-sm">{location}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MarketingCta() {
  return (
    <section className="ht-cta-section px-5 py-20 sm:px-8">
      <div className="ht-cta-banner mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] p-8 md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="ht-cta-eyebrow text-sm font-black uppercase tracking-[0.28em]">
              Ready to build
            </p>
            <h2 className="ht-cta-title mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Launch your next project with a beautiful delivery system.
            </h2>
            <p className="ht-cta-muted mt-5 max-w-3xl text-lg leading-8">
              Use Tasker as your project command center, then partner with our team to deliver full-stack web,
              AI, and automation solutions end to end.
            </p>
          </div>
          <Link
            href="/auth/signup"
            className="ht-cta-btn rounded-full px-8 py-4 text-center text-sm font-black transition hover:-translate-y-1"
          >
            Start free
          </Link>
        </div>
      </div>
    </section>
  );
}
