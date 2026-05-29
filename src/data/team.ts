export type TeamSocialLinks = {
  linkedin?: string;
  twitter?: string;
  github?: string;
  email?: string;
};

export type LeadershipTeamMember = {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoUrl?: string;
  department?: string;
  socialLinks: TeamSocialLinks;
};

export const leadershipTeamMembers: LeadershipTeamMember[] = [
  {
    id: "1",
    name: "Arvind Kumar Sahu",
    title: "Founder",
    bio: "IIIT Nagpur CSE alumnus with 6 years of experience building full-stack products, AI workflows, and delivery systems for high-growth teams.",
    photoUrl: "/images/team/arvind-kumar-sahu.jpeg",
    department: "Executive",
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/gopherarvind/",
    },
  },
  {
    id: "2",
    name: "Manish Kumar Purohit",
    title: "Co-founder",
    bio: "Leads execution across product, partnerships, and operations to keep delivery predictable while scaling customer outcomes.",
    photoUrl: "/images/team/manish-purohit.jpeg",
    department: "Executive",
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/manish-rajpurohit/",
    },
  },
  {
    id: "3",
    name: "Ranjan Kumar",
    title: "Software Engineer 2",
    bio: "Builds scalable backend systems, robust APIs, and delivery-critical workflows that support fast-moving cross-functional teams.",
    photoUrl: "/images/team/ranjan-kumar.jpeg",
    department: "Engineering",
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/ranjankumarrk/",
    },
  },
  {
    id: "4",
    name: "Ashish Kumar",
    title: "UI/UX Engineer",
    bio: "Designs polished, accessible user experiences and component systems that keep usability high across product touchpoints.",
    photoUrl: "/images/team/ashish-kumar.jpeg",
    department: "Design",
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/ashishkumaruiux/",
    },
  },
  {
    id: "5",
    name: "Raju J",
    title: "Sales Director",
    bio: "Owns enterprise sales, requirement discovery, and customer communication to align business goals with product delivery outcomes.",
    department: "Go-to-market",
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/raju-janagani/",
    },
  },
  {
    id: "6",
    name: "Pranay Fating",
    title: "Advisor",
    bio: "IIIT Nagpur CSE advisor helping shape product strategy, technology direction, and sustainable scaling decisions.",
    department: "AI",
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/pranay-fating-453a5914b/",
    },
  },
  {
    id: "7",
    name: "Purnachandar Vanga",
    title: "Business Analyst",
    bio: "Leads requirement analysis, stakeholder alignment, and process documentation to ensure product scope maps to business impact.",
    photoUrl: "/images/team/purnachandra-vanga.jpeg",
    department: "Business",
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/purnachandar-vanga/",
    },
  },
];
