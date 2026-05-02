import Link from "next/link";

interface Props {
  title: string;
  message?: string;
  action?: { href: string; label: string };
}

/**
 * Centered card used when a route can't render its primary content (e.g.
 * the resource was not found, the user lacks access, or the id is malformed).
 * Keeping the same visual treatment everywhere makes failure modes feel
 * intentional rather than like a stuck spinner.
 */
export default function EmptyState({ title, message, action }: Props) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {message && (
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      )}
      {action && (
        <div className="mt-4">
          <Link href={action.href} className="btn-primary inline-flex">
            {action.label}
          </Link>
        </div>
      )}
    </div>
  );
}
