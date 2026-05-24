import { MarketingLayout } from "~/components/marketing/MarketingLayout";
import {
  ComparisonMatrix,
  FaqSection,
  MarketingCta,
  RoiCalculator,
  SocialProof,
} from "~/components/marketing/MarketingSections";

export default function VsJiraPage() {
  return (
    <MarketingLayout
      title="Tasker vs Jira · AI Project Management Comparison"
      description="Compare Tasker and Jira on pricing, AI features, ease of use, integrations, onboarding, support, and delivery services."
    >
      <section className="bg-slate-950 px-5 py-24 text-white sm:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">Comparison</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl">
            Tasker vs Jira for modern AI-ready teams.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Keep agile structure without the heavy setup. Tasker combines familiar project
            management patterns with AI assistance and hands-on delivery services.
          </p>
        </div>
      </section>
      <ComparisonMatrix />
      <RoiCalculator />
      <SocialProof />
      <FaqSection />
      <MarketingCta />
    </MarketingLayout>
  );
}
