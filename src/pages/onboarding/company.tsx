import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";

import { CompanyLogoUpload } from "~/components/company/CompanyLogoUpload";
import Layout from "~/components/Layout";
import { DEFAULT_COMPANY_PLAN, type CompanyPlanValue } from "~/constants/company";
import { queueWelcomeTour } from "~/config/welcomeTour";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import { getTrpcMutationErrorMessage } from "~/utils/trpcError";
import { setWorkspaceCookie } from "~/utils/workspaceCookie";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const PLANS: { id: CompanyPlanValue; label: string; hint: string }[] = [
  { id: "FREE", label: "Free", hint: "Up to 10 users" },
  { id: "PRO", label: "Pro", hint: "Growing teams" },
  { id: "BUSINESS", label: "Business", hint: "Advanced controls" },
  { id: "ENTERPRISE", label: "Enterprise", hint: "Contact sales" },
];

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const ws = api.company.workspaceContext.useQuery();
  const completeSetup = api.company.completeSetup.useMutation();
  const inviteUser = api.company.inviteUser.useMutation();
  const createProject = api.project.create.useMutation();

  const [step, setStep] = useState(1);
  const [timezone, setTimezone] = useState("UTC");
  const [plan, setPlan] = useState<CompanyPlanValue>(DEFAULT_COMPANY_PLAN);
  const [inviteEmail, setInviteEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ws.data?.activeCompany?.logoUrl) {
      setLogoUrl(ws.data.activeCompany.logoUrl);
    }
  }, [ws.data?.activeCompany?.logoUrl]);

  async function finishProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await completeSetup.mutateAsync({
        timezone,
        plan,
        logoUrl: logoUrl ?? undefined,
      });
      if (ws.data?.activeCompanyId) {
        setWorkspaceCookie(ws.data.activeCompanyId);
      }
      setStep(2);
    } catch (err) {
      setError(getTrpcMutationErrorMessage(err, "Could not save setup."));
    }
  }

  async function sendSuperAdminInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!inviteEmail.trim()) {
      setStep(3);
      return;
    }
    try {
      await inviteUser.mutateAsync({
        email: inviteEmail.trim(),
        role: "SUPER_ADMIN",
      });
      setInviteEmail("");
      setStep(3);
    } catch (err) {
      setError(getTrpcMutationErrorMessage(err, "Could not send invite."));
    }
  }

  async function createFirstProject(e: FormEvent) {
    e.preventDefault();
    setError(null);
    queueWelcomeTour();
    if (!projectName.trim()) {
      void router.push("/dashboard");
      return;
    }
    try {
      const project = await createProject.mutateAsync({ name: projectName.trim() });
      void router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(getTrpcMutationErrorMessage(err, "Could not create project."));
    }
  }

  function skipProjectAndFinish() {
    queueWelcomeTour();
    void router.push("/dashboard");
  }

  const companyLabel = ws.data?.activeCompany?.name ?? "Your company";

  return (
    <Layout title="Company setup">
      <Head>
        <title>Set up {companyLabel} · Tasker</title>
      </Head>
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold">Welcome to Tasker</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set up <strong>{companyLabel}</strong> — step {step} of 3
        </p>

        {step === 1 && (
          <form onSubmit={finishProfile} className="card mt-6 space-y-4">
            <h2 className="font-semibold">Company profile</h2>
            <CompanyLogoUpload
              companyName={companyLabel}
              initialLogoUrl={ws.data?.activeCompany?.logoUrl}
              onLogoChange={setLogoUrl}
            />
            <div>
              <label className="label" htmlFor="tz">
                Default timezone
              </label>
              <select
                id="tz"
                className="input mt-1 w-full"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Plan</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PLANS.map((p) => (
                  <label
                    key={p.id}
                    className={`cursor-pointer rounded-lg border p-3 ${
                      plan === p.id ? "border-indigo-500 bg-indigo-50" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      className="sr-only"
                      checked={plan === p.id}
                      onChange={() => setPlan(p.id)}
                    />
                    <span className="font-medium">{p.label}</span>
                    <span className="block text-xs text-slate-500">{p.hint}</span>
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary" disabled={completeSetup.isPending}>
              Continue
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={sendSuperAdminInvite} className="card mt-6 space-y-4">
            <h2 className="font-semibold">Invite Super Admins</h2>
            <p className="text-sm text-slate-500">
              Optional — invite colleagues who can manage users and billing.
            </p>
            <div>
              <label className="label" htmlFor="invite-email">
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                className="input mt-1 w-full"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@company.com"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={inviteUser.isPending}>
                Send invite
              </button>
              <button type="button" className="btn-secondary" onClick={() => setStep(3)}>
                Skip
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={createFirstProject} className="card mt-6 space-y-4">
            <h2 className="font-semibold">Create your first project</h2>
            <div>
              <label className="label" htmlFor="project-name">
                Project name
              </label>
              <input
                id="project-name"
                className="input mt-1 w-full"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Product launch"
                maxLength={120}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={createProject.isPending}>
                Create project
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={skipProjectAndFinish}
              >
                Skip
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const redirect = await requireAuth(ctx);
  if (redirect) return redirect;
  return { props: {} };
}
