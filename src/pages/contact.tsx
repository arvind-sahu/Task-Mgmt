import { MarketingLayout } from "~/components/marketing/MarketingLayout";
import {
  LeadCaptureForms,
  SectionIntro,
  SolutionsSection,
} from "~/components/marketing/MarketingSections";

export default function ContactPage() {
  return (
    <MarketingLayout
      title="Contact · Tasker Demo and Sales"
      description="Request a Tasker demo, contact sales, discuss enterprise requirements, or plan a full-stack web and AI integration project."
    >
      <section className="bg-slate-950 px-5 py-24 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">Contact</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl">
            Tell us what you want to build.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Request a product demo, raise a sign-in support query, ask about pricing,
            or share requirements for web, SaaS, cloud, automation, or AI-enabled product delivery.
          </p>
        </div>
      </section>
      <LeadCaptureForms mode="contact" />
      <section className="bg-slate-50 px-5 py-20 text-slate-950 sm:px-8">
        <SectionIntro
          eyebrow="Response promise"
          title="We reply with a concrete next step."
          description="Expect a tailored recommendation covering plan fit, estimated implementation scope, integrations, security requirements, and delivery model."
        />
      </section>
      <SolutionsSection />
    </MarketingLayout>
  );
}
