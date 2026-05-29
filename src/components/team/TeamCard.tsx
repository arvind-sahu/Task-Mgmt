import { useMemo, useState } from "react";

import { type LeadershipTeamMember } from "~/data/team";

type TeamCardProps = {
  member: LeadershipTeamMember;
  index: number;
  isVisible: boolean;
  canViewEmail: boolean;
};

function clampText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SocialIcon({
  kind,
  href,
  label,
}: {
  kind: "linkedin" | "twitter" | "github" | "email";
  href: string;
  label: string;
}) {
  const icon = useMemo(() => {
    if (kind === "linkedin") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M20.45 20.45H16.9v-5.58c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.95v5.67H9.34V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.39-1.85 3.63 0 4.3 2.39 4.3 5.5v6.24ZM5.34 7.44a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45Z"
          />
        </svg>
      );
    }

    if (kind === "twitter") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M18.9 2H22l-6.77 7.73L23.2 22h-6.24l-4.88-6.38L6.5 22H3.4l7.24-8.27L1 2h6.4l4.4 5.83L18.9 2Z"
          />
        </svg>
      );
    }

    if (kind === "github") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.21.68-.48v-1.7c-2.78.6-3.37-1.19-3.37-1.19-.45-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.61.07-.61 1 .07 1.53 1.02 1.53 1.02.88 1.51 2.31 1.07 2.87.82.09-.64.34-1.07.62-1.32-2.22-.25-4.55-1.12-4.55-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.29.1-2.69 0 0 .84-.27 2.75 1.03A9.61 9.61 0 0 1 12 6.8c.85 0 1.72.12 2.52.34 1.9-1.3 2.74-1.03 2.74-1.03.55 1.4.2 2.44.1 2.69.64.7 1.03 1.6 1.03 2.69 0 3.84-2.33 4.7-4.56 4.95.35.3.67.9.67 1.82v2.7c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
          />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2.15-.25L12 11.2l6.85-4.7H5.15ZM19 8.31l-6.43 4.42a1 1 0 0 1-1.14 0L5 8.31v8.94c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V8.31Z"
        />
      </svg>
    );
  }, [kind]);

  const hoverClass =
    kind === "linkedin"
      ? "hover:text-[#0A66C2]"
      : kind === "github"
        ? "hover:text-slate-900"
        : kind === "twitter"
          ? "hover:text-[#1D9BF0]"
          : "hover:text-blue-600";

  return (
    <a
      href={href}
      target={kind === "email" ? undefined : "_blank"}
      rel={kind === "email" ? undefined : "noreferrer"}
      aria-label={label}
      className={`text-slate-400 transition duration-300 hover:-translate-y-0.5 ${hoverClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500`}
    >
      {icon}
    </a>
  );
}

export function TeamCard({ member, index, isVisible, canViewEmail }: TeamCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!member.photoUrl && !imageFailed;

  return (
    <article
      tabIndex={0}
      className={`group h-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 lg:rounded-[20px] ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } motion-reduce:translate-y-0 motion-reduce:opacity-100`}
      style={{
        transitionDelay: isVisible ? `${index * 50}ms` : "0ms",
        transitionDuration: "500ms",
      }}
    >
      <div className="flex justify-center">
        <div className="relative h-[100px] w-[100px] overflow-hidden rounded-full sm:h-[120px] sm:w-[120px]">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.photoUrl}
              alt={`${member.name}, ${member.title}`}
              loading="lazy"
              width={120}
              height={120}
              className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-105"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-black text-white">
              {initialsFromName(member.name)}
            </div>
          )}
        </div>
      </div>

      {member.department && (
        <div className="mt-4">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
            {clampText(member.department, 20)}
          </span>
        </div>
      )}

      <h3 className="mt-5 text-lg font-bold text-slate-900 sm:text-xl">
        {clampText(member.name, 50)}
      </h3>
      <p className="mt-1 text-sm font-semibold text-blue-600">
        {clampText(member.title, 40)}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{clampText(member.bio, 160)}</p>

      <div className="mt-5 flex items-center justify-center gap-4">
        {member.socialLinks.linkedin && (
          <SocialIcon kind="linkedin" href={member.socialLinks.linkedin} label={`${member.name} LinkedIn`} />
        )}
        {member.socialLinks.twitter && (
          <SocialIcon kind="twitter" href={member.socialLinks.twitter} label={`${member.name} Twitter`} />
        )}
        {member.socialLinks.github && (
          <SocialIcon kind="github" href={member.socialLinks.github} label={`${member.name} GitHub`} />
        )}
        {canViewEmail && member.socialLinks.email && (
          <SocialIcon kind="email" href={member.socialLinks.email} label={`Email ${member.name}`} />
        )}
      </div>
    </article>
  );
}
