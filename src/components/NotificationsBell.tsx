import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { type RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";
import { formatDateTime } from "~/utils/date";

type NotificationListItem = RouterOutputs["notification"]["list"][number];

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  const unread = api.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const list = api.notification.list.useQuery(
    { limit: 25 },
    { enabled: open },
  );
  const markRead = api.notification.markRead.useMutation({
    onSuccess: () => {
      void utils.notification.unreadCount.invalidate();
      void utils.notification.list.invalidate();
    },
  });
  const markAllRead = api.notification.markAllRead.useMutation({
    onSuccess: () => {
      void utils.notification.unreadCount.invalidate();
      void utils.notification.list.invalidate();
    },
  });
  const acceptInvite = api.project.acceptInvite.useMutation({
    onSuccess: () => {
      void utils.notification.invalidate();
      void utils.project.invalidate();
    },
  });
  const pendingInvites = api.project.myPendingInvites.useQuery(undefined, {
    enabled: open,
  });

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside, true);
    return () => document.removeEventListener("mousedown", onOutside, true);
  }, [open]);

  const count = unread.data ?? 0;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-slate-600 transition hover:bg-slate-100"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[70] mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:w-80">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            <button
              type="button"
              className="text-xs text-indigo-600 hover:underline"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {pendingInvites.data && pendingInvites.data.length > 0 && (
              <div className="border-b border-slate-100 bg-indigo-50/50 p-2">
                <p className="px-1 text-xs font-medium uppercase text-indigo-700">
                  Project invites
                </p>
                <ul className="mt-1 space-y-1">
                  {pendingInvites.data.map((inv) => (
                    <li
                      key={inv.id}
                      className="rounded-md bg-white p-2 text-sm ring-1 ring-indigo-100"
                    >
                      <p className="font-medium text-slate-800">
                        {inv.project.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        From {inv.invitedBy.name ?? inv.invitedBy.email}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="btn-primary flex-1 py-1 text-xs"
                          disabled={acceptInvite.isPending}
                          onClick={() =>
                            acceptInvite.mutate({ inviteId: inv.id })
                          }
                        >
                          Accept
                        </button>
                        <Link
                          href={`/projects/${inv.project.id}`}
                          className="btn-ghost py-1 text-xs"
                          onClick={() => setOpen(false)}
                        >
                          View
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {list.isLoading && (
              <p className="p-4 text-sm text-slate-500">Loading…</p>
            )}
            {list.data?.length === 0 && !pendingInvites.data?.length && (
              <p className="p-4 text-sm text-slate-500">You&apos;re all caught up.</p>
            )}
            <ul>
              {list.data?.map((n) => (
                <li key={n.id} className="border-b border-slate-50 last:border-0">
                  {n.link ? (
                    <Link
                      href={n.link}
                      className={`block px-3 py-2 hover:bg-slate-50 ${!n.readAt && !n.synthetic ? "bg-indigo-50/40" : ""}`}
                      onClick={() => {
                        if (!n.synthetic && !n.readAt) {
                          markRead.mutate({ id: n.id });
                        }
                        setOpen(false);
                      }}
                    >
                      <NotificationRow n={n} />
                    </Link>
                  ) : (
                    <div className="px-3 py-2">
                      <NotificationRow n={n} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  n,
}: {
  n: NotificationListItem;
}) {
  return (
    <>
      <p className="text-sm font-medium text-slate-800">
        {n.title ?? "Notification"}
      </p>
      <p className="text-xs text-slate-600">{n.message ?? ""}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">
        {formatDateTime(n.createdAt)}
        {n.synthetic ? " · reminder" : ""}
      </p>
    </>
  );
}
