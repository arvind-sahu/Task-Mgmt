import { MarketingLayout } from "~/components/marketing/MarketingLayout";
import {
  FaqSection,
  LeadCaptureForms,
  PricingSection,
  SocialProof,
} from "~/components/marketing/MarketingSections";

export default function PricingPage() {
  return (
    <MarketingLayout
      title="Pricing · Tasker Project Management Plans"
      description="Compare Tasker Free, Pro, Business, and Enterprise plans for AI project management, sprint planning, automation, and delivery support."
    >
      <section className="bg-slate-950 px-5 py-24 text-white sm:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">Pricing</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl">
            Start free, scale into AI-powered delivery.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Choose self-serve plans for product teams or contact sales for enterprise security,
            SSO, onboarding, implementation, and full-stack solution delivery.
          </p>
        </div>
      </section>
      <PricingSection />
      <SocialProof />
      <FaqSection />
      <LeadCaptureForms mode="contact" />
    </MarketingLayout>
  );
}
