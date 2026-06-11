import Head from "next/head";
import { useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";
import type { CompanyRoleValue as CompanyRole } from "~/constants/company";

import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import { getTrpcMutationErrorMessage } from "~/utils/trpcError";

type InviteableRole = "SUPER_ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

const INVITE_ROLES: { value: InviteableRole; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "MEMBER", label: "Member" },
  { value: "VIEWER", label: "Viewer" },
];

function roleLabel(role: CompanyRole) {
  return INVITE_ROLES.find((r) => r.value === role)?.label ?? role;
}

export default function CompanyUsersPage() {
  const ws = api.company.workspaceContext.useQuery();
  const members = api.company.listMembers.useQuery(undefined, {
    enabled: ws.data?.canManageCompany ?? false,
  });
  const invites = api.company.listPendingInvites.useQuery(undefined, {
    enabled: (ws.data?.canManageCompany || ws.data?.canInviteUsers) ?? false,
  });
  const inviteUser = api.company.inviteUser.useMutation();
  const removeMember = api.company.removeMember.useMutation();
  const utils = api.useUtils();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteableRole>("MANAGER");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canAccess = ws.data?.canManageCompany || ws.data?.canInviteUsers;

  async function submitInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await inviteUser.mutateAsync({ email: email.trim(), role });
      setEmail("");
      setInfo("Invitation sent.");
      await utils.company.listPendingInvites.invalidate();
    } catch (err) {
      setError(getTrpcMutationErrorMessage(err, "Could not send invite."));
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the entire company?`)) return;
    try {
      await removeMember.mutateAsync({ userId });
      await utils.company.listMembers.invalidate();
    } catch (err) {
      setError(getTrpcMutationErrorMessage(err, "Could not remove user."));
    }
  }

  if (ws.isLoading) {
    return (
      <Layout title="Company users">
        <p className="text-sm text-slate-500">Loading…</p>
      </Layout>
    );
  }

  if (!canAccess) {
    return (
      <Layout title="Company users">
        <p className="text-sm text-slate-600">
          You do not have permission to manage company users.
        </p>
      </Layout>
    );
  }

  const availableRoles = INVITE_ROLES.filter((r) => {
    if (ws.data?.role === "ROOT") return true;
    if (ws.data?.role === "SUPER_ADMIN")
      return ["MANAGER", "MEMBER", "VIEWER"].includes(r.value);
    if (ws.data?.role === "MANAGER")
      return ["MEMBER", "VIEWER"].includes(r.value);
    return false;
  });

  return (
    <Layout title="Company users">
      <Head>
        <title>Company users · Tasker</title>
      </Head>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Company users</h1>
        <p className="text-sm text-slate-500">
          {ws.data?.activeCompany?.name} — invite and manage workspace members
        </p>
      </div>

      <form onSubmit={submitInvite} className="card mb-6 space-y-4">
        <h2 className="font-semibold">Invite user</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            className="input flex-1"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select
            className="input sm:w-40"
            value={role}
            onChange={(e) => setRole(e.target.value as InviteableRole)}
          >
            {availableRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary shrink-0" disabled={inviteUser.isPending}>
            Invite
          </button>
        </div>
        {info && <p className="text-sm text-emerald-700">{info}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <section className="card mb-6">
        <h2 className="mb-3 font-semibold">Members</h2>
        <ul className="divide-y">
          {members.data?.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium">{m.user.name ?? m.user.email}</p>
                <p className="text-xs text-slate-500">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="chip text-xs">{roleLabel(m.role)}</span>
                {m.role !== "ROOT" && ws.data?.canManageCompany && (
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() =>
                      void handleRemove(m.user.id, m.user.name ?? m.user.email)
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {invites.data && invites.data.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Pending invites</h2>
          <ul className="divide-y">
            {invites.data.map((inv) => (
              <li key={inv.id} className="flex justify-between py-2 text-sm">
                <span>{inv.email}</span>
                <span className="text-slate-500">{roleLabel(inv.role)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Layout>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const redirect = await requireAuth(ctx);
  if (redirect) return redirect;
  return { props: {} };
}
