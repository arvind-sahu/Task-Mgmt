import { getSession, signIn } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useRef, useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";

import { AuthShell } from "~/components/auth/AuthShell";
import { OtpInput } from "~/components/auth/OtpInput";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/utils/api";
import { getTrpcMutationErrorMessage } from "~/utils/trpcError";
import { setWorkspaceCookie } from "~/utils/workspaceCookie";

export default function CompanySignUpPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const verifyingRef = useRef(false);

  const sendOtp = api.company.sendCompanySignupOtp.useMutation();
  const verifyCreate = api.company.verifyAndCreateWorkspace.useMutation();

  const formReady =
    agreeTerms &&
    password === confirmPassword &&
    confirmPassword.length > 0 &&
    companyName.trim().length >= 2 &&
    emailDomain.trim().length >= 3 &&
    name.trim().length > 0 &&
    email.includes("@");

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    setError(null);

    if (!agreeTerms) {
      setError("Please agree to the terms to continue.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter them.");
      return;
    }

    try {
      await sendOtp.mutateAsync({
        companyName,
        emailDomain,
        name,
        email,
        password,
        agreeTerms: true,
      });
      setOtp("");
      setOtpStep(true);
      setInfo(
        "We sent a 6-digit verification code to your work email. Enter it below to create your workspace.",
      );
    } catch (err) {
      setError(
        getTrpcMutationErrorMessage(
          err,
          "Could not send the verification code. Please try again.",
        ),
      );
    }
  }

  const submitOtp = useCallback(
    async (code: string) => {
      if (code.length !== 6 || verifyingRef.current) return;

      verifyingRef.current = true;
      setInfo(null);
      setError(null);
      setLoading(true);

      try {
        const result = await verifyCreate.mutateAsync({
          companyName,
          emailDomain,
          name,
          email,
          password,
          otp: code,
          agreeTerms: true,
        });

        setWorkspaceCookie(result.companyId);

        const signInResult = await signIn("credentials", {
          email,
          password,
          authFlow: "company-signup",
          redirect: false,
        });

        if (signInResult?.error) {
          setError(
            "Workspace created, but automatic sign-in failed. Please sign in.",
          );
          void router.push("/auth/signin");
          return;
        }

        await getSession();

        if (result.needsOnboarding) {
          void router.replace("/onboarding/company");
        } else {
          void router.replace("/dashboard");
        }
      } catch (err) {
        setError(
          getTrpcMutationErrorMessage(
            err,
            "Invalid or expired code. Request a new code and try again.",
          ),
        );
      } finally {
        verifyingRef.current = false;
        setLoading(false);
      }
    },
    [
      companyName,
      emailDomain,
      email,
      name,
      password,
      router,
      verifyCreate,
    ],
  );

  async function handleVerifyAndCreate(e: FormEvent) {
    e.preventDefault();
    await submitOtp(otp);
  }

  async function handleResendOtp() {
    setInfo(null);
    setError(null);
    setOtp("");
    verifyingRef.current = false;
    try {
      await sendOtp.mutateAsync({
        companyName,
        emailDomain,
        name,
        email,
        password,
        agreeTerms: true,
      });
      setInfo("A new verification code was sent to your work email.");
    } catch (err) {
      setError(
        getTrpcMutationErrorMessage(
          err,
          "Could not resend the verification code. Please try again.",
        ),
      );
    }
  }

  function handleEditDetails() {
    setOtpStep(false);
    setOtp("");
    setInfo(null);
    setError(null);
    verifyingRef.current = false;
  }

  return (
    <>
      <Head>
        <title>Create company workspace · Tasker</title>
      </Head>
      <AuthShell
        title={otpStep ? "Enter the verification code" : "Create your company workspace"}
        subtitle={
          otpStep
            ? "Check your inbox for the 6-digit code. Your workspace is created only after verification."
            : "You will become the root administrator. We will email you a code before any account is created."
        }
        compact={otpStep}
      >
        <div className="rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-2xl shadow-blue-200/60 ring-1 ring-blue-100/50 backdrop-blur-xl sm:p-5">
          {!otpStep ? (
            <>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="label" htmlFor="company-name">
                    Company name
                  </label>
                  <input
                    id="company-name"
                    className="brand-input mt-1.5 h-11 text-sm"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="email-domain">
                    Company email domain
                  </label>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="text-sm text-slate-500">@</span>
                    <input
                      id="email-domain"
                      className="brand-input h-11 flex-1 text-sm"
                      placeholder="acme.com"
                      value={emailDomain}
                      onChange={(e) =>
                        setEmailDomain(e.target.value.replace(/^@+/, ""))
                      }
                      required
                      maxLength={120}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Your work email must use this domain (e.g. you@acme.com).
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="full-name">
                    Your full name
                  </label>
                  <input
                    id="full-name"
                    className="brand-input mt-1.5 h-11 text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={80}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="work-email">
                    Work email
                  </label>
                  <input
                    id="work-email"
                    type="email"
                    className="brand-input mt-1.5 h-11 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="password">
                    Password (min 8 characters)
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="brand-input h-11 w-full pr-12 text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="confirm-password">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    className="brand-input mt-1.5 h-11 text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                    autoComplete="new-password"
                    aria-invalid={
                      confirmPassword.length > 0 && password !== confirmPassword
                    }
                  />
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      Passwords do not match.
                    </p>
                  )}
                </div>
                <label className="flex items-start gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I agree to Tasker&apos;s terms of service and privacy policy.
                  </span>
                </label>

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sendOtp.isPending || !formReady}
                  className="brand-button-primary h-11 w-full"
                >
                  {sendOtp.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Sending code...
                    </span>
                  ) : (
                    "Send verification code"
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="font-bold text-purple-600 underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
              <p className="mt-2 text-center text-sm text-slate-600">
                Joining as an individual?{" "}
                <Link
                  href="/auth/signup"
                  className="font-bold text-purple-600 underline-offset-4 hover:underline"
                >
                  Personal sign up
                </Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleVerifyAndCreate} className="space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-sm text-slate-600">We sent a 6-digit code to</p>
                <p className="mt-1 break-all text-sm font-black text-slate-900">
                  {email}
                </p>
                <button
                  type="button"
                  onClick={handleEditDetails}
                  className="mt-2 text-sm font-bold text-blue-600 underline-offset-4 hover:underline"
                >
                  Edit details
                </button>
              </div>

              <div>
                <p id="company-otp-label" className="label text-center">
                  Verification code
                </p>
                <div className="mt-3">
                  <OtpInput
                    id="company-otp"
                    value={otp}
                    onChange={setOtp}
                    onComplete={(code) => void submitOtp(code)}
                    disabled={loading || verifyCreate.isPending}
                  />
                </div>
              </div>

              {info && (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {info}
                </p>
              )}
              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  loading || verifyCreate.isPending || otp.length !== 6
                }
                className="brand-button-primary h-11 w-full"
              >
                {loading || verifyCreate.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Verifying & signing you in...
                  </span>
                ) : (
                  "Verify & continue"
                )}
              </button>

              <p className="text-center text-sm text-slate-600">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={() => void handleResendOtp()}
                  disabled={sendOtp.isPending}
                  className="font-bold text-purple-600 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendOtp.isPending ? "Sending..." : "Resend OTP"}
                </button>
              </p>
            </form>
          )}
        </div>
      </AuthShell>
    </>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerAuthSession(ctx);
  if (session) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }
  return { props: {} };
}
