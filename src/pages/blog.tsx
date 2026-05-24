import { MarketingLayout } from "~/components/marketing/MarketingLayout";
import {
  BlogGrid,
  CaseStudies,
  LeadCaptureForms,
  MarketingCta,
} from "~/components/marketing/MarketingSections";

export default function BlogPage() {
  return (
    <MarketingLayout
      title="Resources · Tasker Project Management Blog"
      description="Read Tasker resources on AI project management, remote productivity, Jira alternatives, API integrations, security, trends, and case studies."
    >
      <section className="bg-slate-950 px-5 py-24 text-white sm:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">Resources</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl">
            Playbooks for AI-powered project delivery.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Blog articles, comparison guides, case studies, API notes, security practices,
            and trends for teams choosing a modern Jira alternative.
          </p>
        </div>
      </section>
      <BlogGrid />
      <CaseStudies />
      <LeadCaptureForms />
      <MarketingCta />
    </MarketingLayout>
  );
}
