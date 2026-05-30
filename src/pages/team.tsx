import { MarketingLayout } from "~/components/marketing/MarketingLayout";
import { MarketingCta, TeamSection } from "~/components/marketing/MarketingSections";

export default function TeamPage() {
  return (
    <MarketingLayout
      title="Team · Tasker Delivery Company"
      description="Meet the Tasker team across product, engineering, design, sales, AI, and business analysis."
    >
      <section className="bg-slate-950 px-5 py-24 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">Tasker Team</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl">
            Meet the people building Tasker.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Our leadership and delivery team brings together product strategy, engineering,
            AI, design, sales, and business analysis to help teams ship with confidence.
          </p>
        </div>
      </section>
      <TeamSection />
      <MarketingCta />
    </MarketingLayout>
  );
}
