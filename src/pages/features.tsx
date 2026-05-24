import { MarketingLayout } from "~/components/marketing/MarketingLayout";
import {
  FeatureGrid,
  InteractiveDemo,
  MarketingCta,
  RoiCalculator,
  SectionIntro,
  SocialProof,
} from "~/components/marketing/MarketingSections";

export default function FeaturesPage() {
  return (
    <MarketingLayout
      title="Features · Tasker AI Project Management"
      description="Explore Tasker's AI task intelligence, visual planning, real-time collaboration, analytics, integrations, and enterprise security."
    >
      <section className="bg-slate-950 px-5 py-24 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">Features</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl">
            Everything a modern delivery team needs before and after login.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Replace scattered boards, spreadsheets, status meetings, and manual reporting with a
            single AI-ready workspace for planning, building, launching, and improving products.
          </p>
        </div>
      </section>
      <FeatureGrid detailed />
      <InteractiveDemo />
      <RoiCalculator />
      <SocialProof />
      <section className="bg-white px-5 py-20 text-slate-950 sm:px-8">
        <SectionIntro
          eyebrow="Performance and security"
          title="Built for conversion and serious teams."
          description="Marketing pages are static-friendly, animation is CSS-based, and authenticated app routes remain preserved for existing users."
        />
      </section>
      <MarketingCta />
    </MarketingLayout>
  );
}
