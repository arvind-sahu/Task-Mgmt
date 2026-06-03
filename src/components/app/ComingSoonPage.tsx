import Link from "next/link";

type ComingSoonPageProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
};

export function ComingSoonPage({
  title,
  description = "We're building this feature. Check back soon.",
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: ComingSoonPageProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="app-coming-soon-icon mb-5 grid h-16 w-16 place-items-center rounded-2xl text-2xl">
        ✨
      </div>
      <h1 className="text-2xl font-semibold text-heading">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--accent-muted-text)]">
        Coming soon
      </p>
      <Link href={backHref} className="btn-primary mt-6 px-5 py-2 text-sm">
        {backLabel}
      </Link>
    </div>
  );
}
