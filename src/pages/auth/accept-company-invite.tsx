import { getSession, signIn, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";

import { AuthShell } from "~/components/auth/AuthShell";
import { api } from "~/utils/api";
import { getTrpcMutationErrorMessage } from "~/utils/trpcError";
import { setWorkspaceCookie } from "~/utils/workspaceCookie";

export default function AcceptCompanyInvitePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token =
    typeof router.query.token === "string" ? router.query.token : "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const invite = api.company.getInviteByToken.useQuery(
    { token },
    { enabled: token.length > 0 },
  );

  const accept = api.company.acceptInvite.useMutation();

  useEffect(() => {
    if (invite.data?.existingUserName) {
      setName(invite.data.existingUserName);
    }
  }, [invite.data?.existingUserName]);

  async function handleAccept(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid invitation link.");
      return;
    }

    const needsAccount = !invite.data?.hasAccount;
    if (needsAccount) {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!name.trim()) {
        setError("Name is required.");
        return;
      }
    }

    setLoading(true);
    try {
      const result = await accept.mutateAsync({
        token,
        name: needsAccount ? name : undefined,
        password: needsAccount ? password : undefined,
      });

      setWorkspaceCookie(result.companyId);

      if (!session && needsAccount) {
        const signInResult = await signIn("credentials", {
          email: invite.data!.email,
          password,
          authFlow: "invite",
          inviteToken: token,
          redirect: false,
        });
        if (signInResult?.error) {
          setError("Joined workspace, but sign-in failed. Please sign in.");
          void router.push("/auth/signin");
          return;
        }
        await getSession();
      }

      void router.replace("/dashboard");
    } catch (err) {
      setError(getTrpcMutationErrorMessage(err, "Could not accept invitation."));
    } finally {
      setLoading(false);
    }
  }

  async function acceptAsSignedIn() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await accept.mutateAsync({ token });
      setWorkspaceCookie(result.companyId);
      await getSession();
      void router.replace("/dashboard");
    } catch (err) {
      setError(getTrpcMutationErrorMessage(err, "Could not join workspace."));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid invite" subtitle="This link is missing a token.">
        <p className="text-sm text-slate-600">
          Ask your admin to send a new invitation.
        </p>
      </AuthShell>
    );
  }

  if (invite.isLoading) {
    return (
      <AuthShell title="Loading invitation…" subtitle="Please wait.">
        <p className="text-sm text-slate-500">Checking invite…</p>
      </AuthShell>
    );
  }

  if (invite.isError || !invite.data) {
    return (
      <AuthShell title="Invitation unavailable" subtitle="This link may have expired.">
        <p className="text-sm text-red-600">
          {getTrpcMutationErrorMessage(invite.error, "Invite not found.")}
        </p>
        <Link href="/auth/signin" className="mt-4 inline-block text-sm font-semibold text-indigo-600">
          Sign in
        </Link>
      </AuthShell>
    );
  }

  const { companyName, inviterName, role, email, hasAccount } = invite.data;
  const roleLabel =
    role === "SUPER_ADMIN"
      ? "Super Admin"
      : role === "MANAGER"
        ? "Manager"
        : role === "VIEWER"
          ? "Viewer"
          : "Member";

  return (
    <>
      <Head>
        <title>Join {companyName} · Tasker</title>
      </Head>
      <AuthShell
        title={`Join ${companyName}`}
        subtitle={`${inviterName} invited you as ${roleLabel}.`}
        compact
      >
        {hasAccount && status === "authenticated" ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Signed in as <strong>{session?.user?.email}</strong>. Confirm joining
              this workspace.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              className="btn-primary w-full"
              disabled={loading}
              onClick={() => void acceptAsSignedIn()}
            >
              {loading ? "Joining…" : "Join workspace"}
            </button>
          </div>
        ) : hasAccount ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Sign in as <strong>{email}</strong> to accept this invitation.
            </p>
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent(router.asPath)}`}
              className="btn-primary block w-full text-center"
            >
              Sign in to accept
            </Link>
          </div>
        ) : (
          <form onSubmit={handleAccept} className="space-y-4">
            <p className="text-sm text-slate-600">
              Create your account for <strong>{email}</strong>.
            </p>
            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                className="input mt-1 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input mt-1 w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="label" htmlFor="confirm">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                className="input mt-1 w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Joining…" : "Accept & join"}
            </button>
          </form>
        )}
      </AuthShell>
    </>
  );
}
