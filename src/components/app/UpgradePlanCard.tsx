import Link from "next/link";

type UpgradePlanCardProps = {
  collapsed?: boolean;
};

/** Shown for users on the free tier — billing is marketing-only for now. */
export function UpgradePlanCard({ collapsed }: UpgradePlanCardProps) {
  if (collapsed) {
    return (
      <Link
        href="/pricing"
        className="app-sidebar-upgrade-collapsed grid h-9 w-9 place-items-center rounded-lg transition"
        title="Upgrade to Pro"
        aria-label="Upgrade to Pro"
      >
        <span className="text-base" aria-hidden>
          🚀
        </span>
      </Link>
    );
  }

  return (
    <div className="app-sidebar-upgrade rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-muted-bg)] text-base">
          🚀
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-heading">Upgrade to Pro</p>
          <p className="text-[11px] leading-snug text-muted">
            Advanced reports, AI summaries & more.
          </p>
        </div>
      </div>
      <Link href="/pricing" className="btn-primary block w-full py-1.5 text-center text-xs">
        Upgrade now
      </Link>
    </div>
  );
}
