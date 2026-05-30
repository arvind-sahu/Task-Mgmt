import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { leadershipTeamMembers } from "~/data/team";
import { TeamCard } from "~/components/team/TeamCard";

function getDesktopSpanClass(index: number, total: number) {
  const remainder = total % 4;
  if (remainder === 0) return "xl:col-span-3";

  const lastRowStart = total - remainder;
  if (index < lastRowStart) return "xl:col-span-3";

  if (remainder === 3) return "xl:col-span-4";
  if (remainder === 2) return "xl:col-span-6";
  return "xl:col-span-12 xl:max-w-md xl:justify-self-center";
}

export function LeadershipTeamSection() {
  const { status } = useSession();
  const canViewEmail = status === "authenticated";
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = sectionRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="leadership-team"
      ref={sectionRef}
      className="marketing-section bg-[linear-gradient(135deg,#F8FAFC_0%,#EFF6FF_100%)] px-4 text-slate-950 sm:px-5 md:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.26em] text-blue-600">
              Executive team
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Meet Our Leadership Team
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Experienced leaders across product, engineering, AI, and go-to-market helping teams deliver faster with confidence.
            </p>
          </div>
          <Link
            href="/team"
            className="self-start rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            View All Team
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 md:gap-6 xl:grid-cols-12 xl:gap-7">
          {leadershipTeamMembers.map((member, index) => (
            <div key={member.id} className={getDesktopSpanClass(index, leadershipTeamMembers.length)}>
              <TeamCard member={member} index={index} isVisible={isVisible} canViewEmail={canViewEmail} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
