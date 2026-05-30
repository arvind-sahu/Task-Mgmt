import { signIn } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";

import { AuthShell } from "~/components/auth/AuthShell";
import { OAuthButtons } from "~/components/auth/OAuthButtons";
import { getServerAuthSession } from "~/server/auth";
import {
  getOAuthProvidersForAuthPage,
  type OAuthProviderOption,
} from "~/server/oauth";
import { api } from "~/utils/api";
import { getTrpcMutationErrorMessage } from "~/utils/trpcError";

/**
 * Email + password sign-in page. Talks to the NextAuth Credentials provider
 * via `signIn("credentials", { redirect: false })` so we can show inline
 * errors instead of bouncing through `?error=` query params.
 */
type SignInPageProps = {
  oauthProviders: OAuthProviderOption[];
};

export default function SignInPage({ oauthProviders }: SignInPageProps) {
  const router = useRouter();
  const callbackUrl =
    typeof router.query.callbackUrl === "string"
      ? router.query.callbackUrl
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendLoginOtp = api.user.sendLoginOtp.useMutation();
  const verifyLoginOtp = api.user.verifyLoginOtp.useMutation();
  const emailInvalid = emailTouched && email.length > 0 && !email.includes("@");

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    setError(null);
    try {
      await sendLoginOtp.mutateAsync({ email, password });
      setOtpRequested(true);
      setInfo("OTP sent to your email. Enter it below to continue.");
    } catch (err) {
      setError(
        getTrpcMutationErrorMessage(
          err,
          "Could not send the verification code. Please try again.",
        ),
      );
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    setError(null);
    setLoading(true);
    try {
      await verifyLoginOtp.mutateAsync({ email, otp });
    } catch (err) {
      setLoading(false);
      setError(
        getTrpcMutationErrorMessage(
          err,
          "Invalid or expired verification code",
        ),
      );
      return;
    }
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (!res || res.error) {
      setError("Invalid email or password");
      return;
    }
    void router.push(res.url ?? callbackUrl);
  }

  return (
    <>
      <Head>
        <title>Sign in · Tasker</title>
      </Head>
      <AuthShell
        title="Sign in to continue"
        subtitle="Access your secure Tasker workspace with email OTP or a connected account."
        compact
        titleHelp={
          <p className="text-sm font-black text-slate-700">            
            <Link
              href="/contact"
              className="text-emerald-600 underline-offset-4 transition hover:text-emerald-700 hover:underline"
            >
              Need help?
            </Link>
          </p>
        }
      >
        <div className="rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-2xl shadow-blue-200/60 ring-1 ring-blue-100/50 backdrop-blur-xl">
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              "Secure sign-in",
              "SSO available",
              "No public workspace data",
            ].map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100"
              >
                {badge}
              </span>
            ))}
          </div>

          <form
            onSubmit={otpRequested ? handleOtpSubmit : handlePasswordSubmit}
            className="space-y-3"
          >
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="brand-input mt-1.5 h-11 text-sm"
                value={email}
                onBlur={() => setEmailTouched(true)}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={otpRequested}
                aria-invalid={emailInvalid}
                aria-describedby={emailInvalid ? "email-error" : undefined}
              />
              {emailInvalid && (
                <p
                  id="email-error"
                  className="mt-2 text-sm font-semibold text-red-600"
                >
                  Enter a valid work email address.
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="brand-input h-11 pr-12 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={otpRequested}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(event) => setRememberDevice(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember this device for 30 days
              </label>
              <Link
                href="/auth/forgot-password"
                className="font-bold text-purple-600 underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {otpRequested && (
              <div>
                <label className="label" htmlFor="otp">
                  Email OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  className="brand-input mt-1.5 h-11 text-sm tracking-[0.25em]"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                />
              </div>
            )}

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
                loading || sendLoginOtp.isPending || verifyLoginOtp.isPending
              }
              className="brand-button-primary h-11 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-blue-600/25 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700"
            >
              {!otpRequested ? (
                sendLoginOtp.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Sending OTP...
                  </span>
                ) : (
                  "Send OTP"
                )
              ) : loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in...
                </span>
              ) : (
                "Verify OTP & sign in"
              )}
            </button>
            {otpRequested && (
              <button
                type="button"
                className="brand-button-secondary h-11 w-full"
                onClick={() => {
                  setOtpRequested(false);
                  setOtp("");
                  setInfo(null);
                  setError(null);
                }}
              >
                Change email/password
              </button>
            )}
          </form>

          <OAuthButtons
            providers={oauthProviders}
            callbackUrl={callbackUrl}
            compact
          />

          <div className="mt-3 space-y-2 text-center text-sm text-slate-600">
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="font-bold text-purple-600 underline-offset-4 hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </AuthShell>
    </>
  );
}

// If the user is already signed in, skip the form and send them home.
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerAuthSession(ctx);
  if (session) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }
  return {
    props: {
      oauthProviders: getOAuthProvidersForAuthPage(),
    },
  };
}
