import { MarketingLayout } from "~/components/marketing/MarketingLayout";
import {
  AboutStory,
  LeadCaptureForms,
  MarketingCta,
  TeamSection,
} from "~/components/marketing/MarketingSections";

export default function AboutPage() {
  return (
    <MarketingLayout
      title="About · Tasker Delivery Company"
      description="Learn about Tasker's mission, team, values, office locations, careers, and end-to-end product delivery approach."
    >
      <section className="bg-slate-950 px-5 py-24 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">About Tasker</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl">
            A product platform backed by a delivery team.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            We help companies turn product ideas into live, secure, scalable software through
            project management tooling, full-stack engineering, AI automation, and ongoing support.
          </p>
        </div>
      </section>
      <AboutStory />
      <TeamSection />
      <section id="careers" className="bg-white px-5 py-20 text-slate-950 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Careers</p>
          <h2 className="mt-4 text-4xl font-black">Build beautiful software with us.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            We are always interested in product managers, full-stack engineers, AI specialists,
            UX designers, QA engineers, and customer-facing delivery leaders.
          </p>
        </div>
      </section>
      <LeadCaptureForms mode="contact" />
      <MarketingCta />
    </MarketingLayout>
  );
}
