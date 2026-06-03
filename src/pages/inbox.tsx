import Link from "next/link";
import type { GetServerSidePropsContext } from "next";

import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";
import { type RouterOutputs, api } from "~/utils/api";
import { formatDateTime } from "~/utils/date";

type NotificationItem = RouterOutputs["notification"]["list"][number];

export default function InboxPage() {
  const utils = api.useUtils();
  const list = api.notification.list.useQuery({ limit: 50 });
  const pendingInvites = api.project.myPendingInvites.useQuery();
  const markRead = api.notification.markRead.useMutation({
    onSuccess: () => {
      void utils.notification.invalidate();
    },
  });
  const markAllRead = api.notification.markAllRead.useMutation({
    onSuccess: () => {
      void utils.notification.invalidate();
    },
  });
  const acceptInvite = api.project.acceptInvite.useMutation({
    onSuccess: () => {
      void utils.notification.invalidate();
      void utils.project.invalidate();
    },
  });

  return (
    <Layout title="Inbox">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-heading sm:text-2xl">Inbox</h1>
          <p className="text-sm text-muted">Notifications, invites, and reminders</p>
        </div>
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
        >
          Mark all read
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="card overflow-hidden p-0">
          {list.isLoading && <p className="p-4 text-sm text-muted">Loading…</p>}
          {!list.isLoading && (list.data?.length ?? 0) === 0 && (
            <p className="p-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
          )}
          <ul className="list-divider max-h-[calc(100vh-11rem)] overflow-y-auto">
            {list.data?.map((n) => (
              <li
                key={n.id}
                className={`border-b last:border-0 ${!n.readAt && !n.synthetic ? "bg-[var(--accent-muted-bg)]/40" : ""}`}
                style={{ borderColor: "var(--border-muted)" }}
              >
                {n.link ? (
                  <Link
                    href={n.link}
                    className="block px-4 py-3 transition hover:bg-[var(--nav-link-hover-bg)]"
                    onClick={() => {
                      if (!n.synthetic && !n.readAt) markRead.mutate({ id: n.id });
                    }}
                  >
                    <NotificationBody n={n} />
                  </Link>
                ) : (
                  <div className="px-4 py-3">
                    <NotificationBody n={n} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-heading">Project invites</h2>
            {pendingInvites.isLoading && (
              <p className="text-sm text-muted">Loading…</p>
            )}
            {pendingInvites.data?.length === 0 && (
              <p className="text-sm text-muted">No pending invites.</p>
            )}
            <ul className="space-y-2">
              {pendingInvites.data?.map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: "var(--border)" }}
                >
                  <p className="text-sm font-medium text-heading">{inv.project.name}</p>
                  <p className="text-xs text-muted">
                    From {inv.invitedBy.name ?? inv.invitedBy.email}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="btn-primary flex-1 py-1 text-xs"
                      disabled={acceptInvite.isPending}
                      onClick={() => acceptInvite.mutate({ inviteId: inv.id })}
                    >
                      Accept
                    </button>
                    <Link href={`/projects/${inv.project.id}`} className="btn-ghost py-1 text-xs">
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Layout>
  );
}

function NotificationBody({ n }: { n: NotificationItem }) {
  return (
    <>
      <p className="text-sm font-medium text-heading">{n.title ?? "Notification"}</p>
      <p className="mt-0.5 text-xs text-muted">{n.message ?? ""}</p>
      <p className="mt-1 text-[10px] text-muted">
        {formatDateTime(n.createdAt)}
        {n.synthetic ? " · reminder" : ""}
      </p>
    </>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}
