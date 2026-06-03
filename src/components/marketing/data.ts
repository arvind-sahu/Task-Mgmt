export const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/team", label: "Team" },
  { href: "/blog", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

export const featureCards = [
  {
    icon: "SP",
    title: "Sprint Planning",
    description:
      "Plan sprints visually with drag-drop boards, estimates, priorities, and clear ownership.",
    details: ["Drag-drop planning", "Backlog priority", "Sprint ownership"],
  },
  {
    icon: "AI",
    title: "AI-Powered Insights",
    description:
      "Auto-detect blockers, summarize activity, and predict delivery risks before they slow releases.",
    details: ["Blocker detection", "Risk prediction", "AI summaries"],
  },
  {
    icon: "RT",
    title: "Real-time Collaboration",
    description:
      "Keep everyone aligned with comments, mentions, attachments, notifications, and shared project context.",
    details: ["Live comments", "@mentions", "File sharing"],
  },
  {
    icon: "RM",
    title: "Release Management",
    description:
      "Track releases with automated checklists, readiness gates, approvals, and launch visibility.",
    details: ["Release gates", "Checklists", "Launch readiness"],
  },
  {
    icon: "AD",
    title: "Analytics Dashboard",
    description:
      "Give stakeholders custom reports, burndown charts, velocity trends, and workload visibility.",
    details: ["Burndown charts", "Velocity trends", "Custom reports"],
  },
  {
    icon: "SE",
    title: "Enterprise Security",
    description:
      "Protect work with role-based access, audit-friendly activity trails, SSO-ready workflows, and secure teams.",
    details: ["SSO/SAML ready", "Audit logs", "RBAC"],
  },
];

export const productTourSteps = [
  {
    title: "Create a sprint plan",
    description: "Prioritize backlog items, estimate effort, and launch the sprint with clear ownership.",
  },
  {
    title: "Move work across the board",
    description: "Drag cards between statuses while stakeholders see progress instantly.",
  },
  {
    title: "Collaborate in context",
    description: "Use comments, attachments, and mentions to keep decisions attached to the task.",
  },
  {
    title: "Read AI insights",
    description: "Spot delayed work, overloaded owners, and suggested next actions before status meetings.",
  },
  {
    title: "Report outcomes",
    description: "Share velocity, completion, and risk dashboards with leadership in minutes.",
  },
];

export const trustStats = [
  { value: "50,000+", label: "Tasks managed" },
  { value: "2,000+", label: "Happy teams" },
  { value: "99.9%", label: "Workflow uptime" },
  { value: "24/7", label: "Support coverage" },
];

export const customerLogos = [
  "Northstar Tech",
  "FinEdge",
  "MediCore",
  "Retailly",
  "CloudForge",
  "HealthGrid",
  "StackPilot",
  "UrbanCart",
];

export const testimonials = [
  {
    quote:
      "Tasker gave our engineering and product teams one source of truth. Sprint planning is faster and leadership finally sees delivery risk early.",
    name: "Priya Sharma",
    role: "VP Product, Northstar Tech",
  },
  {
    quote:
      "The AI summaries and workload views reduced our weekly status meetings by nearly half without losing accountability.",
    name: "Daniel Lee",
    role: "Engineering Director, FinEdge",
  },
  {
    quote:
      "We moved away from scattered spreadsheets and chat threads. Tasker helped us ship a client portal six weeks faster.",
    name: "Sara Khan",
    role: "COO, Retailly",
  },
];

export const caseStudies = [
  {
    company: "Northstar Tech",
    title: "Scaled sprint planning across 14 engineering squads",
    result: "32% faster release planning",
    summary:
      "Northstar consolidated backlog grooming, sprint planning, and leadership reporting into Tasker, reducing delivery admin while improving visibility.",
  },
  {
    company: "MediCore",
    title: "Built a secure healthcare operations dashboard",
    result: "40% less manual follow-up",
    summary:
      "MediCore used Tasker for role-based workflows, attachments, and audit-friendly activity tracking across distributed teams.",
  },
  {
    company: "CloudForge",
    title: "Integrated AI triage into support engineering",
    result: "18 hours saved weekly",
    summary:
      "CloudForge connected Tasker with engineering workflows to summarize tickets, flag blockers, and prioritize critical incidents.",
  },
];

export const pricingPlans = [
  {
    name: "Free",
    priceMonthly: 0,
    description: "Best for small teams validating a new workflow.",
    cta: "Start free",
    href: "/auth/signup",
    features: ["5 users", "Basic boards", "Comments", "Attachments", "Email support"],
  },
  {
    name: "Pro",
    priceMonthly: 1,
    description: "For growing teams that need richer planning and reporting.",
    cta: "Start Pro",
    href: "/auth/signup",
    popular: true,
    features: ["Unlimited projects", "Sprint planning", "Analytics", "AI summaries", "Integrations"],
  },
  {
    name: "Business",
    priceMonthly: 2,
    description: "Advanced controls for high-growth product organizations.",
    cta: "Start Business",
    href: "/auth/signup",
    features: ["Advanced reports", "Priority support", "Audit logs", "Role controls", "Workflow automation"],
  },
  {
    name: "Enterprise",
    priceMonthly: null,
    description: "Custom deployment, security, onboarding, and support.",
    cta: "Contact sales",
    href: "/contact",
    features: ["SSO/SAML", "Dedicated support", "Custom contracts", "Security reviews", "Solution delivery"],
  },
];

export const pricingFaqs = [
  {
    question: "Can we start free and upgrade later?",
    answer:
      "Yes. Start with the free tier, invite your team, and upgrade when you need advanced planning, analytics, or automation.",
  },
  {
    question: "Do you support yearly billing?",
    answer:
      "Yes. Yearly billing includes two months free and is available for Pro, Business, and Enterprise customers.",
  },
  {
    question: "Can you build custom AI workflows?",
    answer:
      "Yes. Our delivery team can design and integrate AI workflows for triage, summaries, planning, reporting, and automation.",
  },
  {
    question: "Is Tasker a Jira replacement?",
    answer:
      "Tasker covers the core Jira-style workflows teams expect, with a cleaner UI and AI-first delivery support.",
  },
];

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
  bio: string;
  avatarUrl?: string;
  education?: string;
  experience?: string;
  email?: string;
  linkedin?: string;
}

export const teamMembers: TeamMember[] = [
  {
    name: "Arvind Kumar Sahu",
    role: "Founder",
    initials: "AS",
    bio: "Leads product strategy, engineering delivery, and customer outcomes end to end.",
    education: "IIIT Nagpur, CSE",
    experience: "6 years of experience",
    linkedin: "https://www.linkedin.com/in/gopherarvind/",
  },
  {
    name: "Manish Kumar Purohit",
    role: "Co-founder",
    initials: "MP",
    bio: "Drives product execution, partnerships, and cross-functional delivery planning.",
    linkedin: "https://www.linkedin.com/in/manish-rajpurohit/",
  },
  {
    name: "Ranjan Kumar",
    role: "Software Engineer 2",
    initials: "RK",
    bio: "Builds and scales APIs, workflows, and core product features for reliability.",
    linkedin: "https://www.linkedin.com/in/ranjankumarrk/",
  },
  {
    name: "Ashish Kumar",
    role: "UI/UX Engineer",
    initials: "AK",
    bio: "Designs polished, accessible interfaces with strong product usability and visual clarity.",
    linkedin: "https://www.linkedin.com/in/ashishkumaruiux/",
  },
  {
    name: "Raju J",
    role: "Sales Director",
    initials: "RJ",
    bio: "Leads enterprise conversations, requirement gathering, and solution positioning.",
    linkedin: "https://www.linkedin.com/in/raju-janagani/",
  },
  {
    name: "Pranay Fating",
    role: "Advisor",
    initials: "PF",
    bio: "Advises on strategy, technology direction, and long-term product growth.",
    education: "IIIT Nagpur, CSE",
    linkedin: "https://www.linkedin.com/in/pranay-fating-453a5914b/",
  },
  {
    name: "Purna Chandra",
    role: "Business Analyst",
    initials: "PC",
    bio: "Owns business requirement analysis, prioritization, and stakeholder alignment.",
    linkedin: "https://www.linkedin.com/in/purnachandar-vanga/",
  },
];

export const values = [
  "Customer outcomes over feature volume",
  "Secure by design",
  "Beautiful software that teams enjoy",
  "Automation where it removes real work",
];

export const engagementModels = [
  "Dedicated product squad",
  "Fixed-scope project delivery",
  "Staff augmentation",
  "AI discovery sprint",
];

export const solutions = [
  "Full-stack web platforms",
  "AI workflow integrations",
  "SaaS dashboards and portals",
  "Cloud deployment and DevOps",
  "Security and access design",
  "Product strategy and delivery",
];

export const blogPosts = [
  {
    slug: "ai-project-management",
    title: "How AI is Transforming Project Management",
    category: "AI",
    readTime: "6 min read",
    excerpt:
      "A practical look at how summaries, predictions, triage, and workflow automation are changing delivery operations.",
  },
  {
    slug: "remote-team-productivity",
    title: "10 Productivity Hacks for Remote Teams",
    category: "Operations",
    readTime: "5 min read",
    excerpt:
      "Simple rituals and tooling patterns that keep distributed teams aligned without adding more meetings.",
  },
  {
    slug: "tasker-vs-jira-asana",
    title: "Compare: Tasker vs Jira vs Asana",
    category: "Comparison",
    readTime: "8 min read",
    excerpt:
      "How Tasker balances agile depth, clean UX, AI assistance, and delivery support for modern teams.",
  },
  {
    slug: "client-time-savings",
    title: "Case Study: How a Client Saved 40% Time",
    category: "Case study",
    readTime: "7 min read",
    excerpt:
      "The workflow redesign that replaced status meetings and scattered trackers with one delivery command center.",
  },
  {
    slug: "project-management-trends",
    title: "2026 Project Management Trends",
    category: "Trends",
    readTime: "4 min read",
    excerpt:
      "AI-assisted planning, outcome dashboards, tighter security, and low-friction collaboration are becoming table stakes.",
  },
  {
    slug: "api-integration-guide",
    title: "API Integration Guide",
    category: "Developer",
    readTime: "9 min read",
    excerpt:
      "How to connect product operations, engineering systems, and customer support workflows into Tasker.",
  },
];

export const comparisonRows = [
  { label: "Free tier", tasker: "Yes", jira: "Limited", note: "Capture leads and start small" },
  { label: "AI task intelligence", tasker: "Built-in", jira: "Add-ons", note: "Summaries, predictions, blockers" },
  { label: "Ease of onboarding", tasker: "Fast", jira: "Complex", note: "Cleaner setup for mixed teams" },
  { label: "End-to-end delivery partner", tasker: "Included", jira: "No", note: "Strategy, build, launch, support" },
  { label: "Support model", tasker: "24/7 + dedicated", jira: "Plan-based", note: "Hands-on help for teams" },
  { label: "Workflow depth", tasker: "Agile + AI", jira: "Agile", note: "Project controls with modern automation" },
];
