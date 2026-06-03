import { MarketingLayout } from "~/components/marketing/MarketingLayout";
import { HomeTimeThemeProvider } from "~/contexts/homeTimeTheme";
import {
  CaseStudies,
  FeatureGrid,
  HomeHero,
  InteractiveDemo,
  LeadCaptureForms,
  MarketingCta,
  PricingSection,
  SectionDivider,
  SocialProof,
  SolutionsSection,
  TeamSection,
  TrustSecuritySection,
} from "~/components/marketing/MarketingSections";

export default function Home() {
  return (
    <HomeTimeThemeProvider>
      <MarketingLayout
        enableTimeTheme
        title="Tasker · AI Project Management and Jira Alternative"
        description="Tasker is a Jira-style project management platform with AI task intelligence, sprint planning, analytics, collaboration, and end-to-end full-stack delivery services."
      >
        <HomeHero timeThemed />
      <FeatureGrid />
      <SectionDivider />
      <InteractiveDemo />
      <SectionDivider />
      <SocialProof />
      <SectionDivider />
      <TrustSecuritySection />
      <SectionDivider />
      <PricingSection />
      <SectionDivider />
      <SolutionsSection />
      <SectionDivider />
      <CaseStudies />
      <SectionDivider />
      <TeamSection />
      <SectionDivider />
      <LeadCaptureForms />
      <MarketingCta />
      </MarketingLayout>
    </HomeTimeThemeProvider>
  );
}
