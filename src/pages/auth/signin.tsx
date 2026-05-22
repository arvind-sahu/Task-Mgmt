import { signIn } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";

import { getServerAuthSession } from "~/server/auth";
import { api } from "~/utils/api";

/**
 * Email + password sign-in page. Talks to the NextAuth Credentials provider
 * via `signIn("credentials", { redirect: false })` so we can show inline
 * errors instead of bouncing through `?error=` query params.
 */
export default function SignInPage() {
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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendLoginOtp = api.user.sendLoginOtp.useMutation();
  const verifyLoginOtp = api.user.verifyLoginOtp.useMutation();

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    setError(null);
    try {
      await sendLoginOtp.mutateAsync({ email, password });
      setOtpRequested(true);
      setInfo("OTP sent to your email. Enter it below to continue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP");
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
      setError(err instanceof Error ? err.message : "OTP verification failed");
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
      <div className="auth-bg grid min-h-screen place-items-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
              T
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-600">
              Sign in with password + OTP verification
            </p>
          </div>

          <form
            onSubmit={otpRequested ? handleOtpSubmit : handlePasswordSubmit}
            className="card glass-card space-y-4"
          >
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={otpRequested}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={otpRequested}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            {otpRequested && (
              <div>
                <label className="label" htmlFor="otp">
                  Email OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  className="input mt-1 tracking-[0.25em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                />
              </div>
            )}

            {info && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
                {info}
              </p>
            )}
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || sendLoginOtp.isPending || verifyLoginOtp.isPending}
              className="btn-primary w-full"
            >
              {!otpRequested
                ? sendLoginOtp.isPending
                  ? "Sending OTP…"
                  : "Continue with OTP"
                : loading
                  ? "Signing in…"
                  : "Verify OTP & sign in"}
            </button>
            {otpRequested && (
              <button
                type="button"
                className="btn-ghost w-full"
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

          <div className="mt-6 space-y-1 text-center text-sm text-slate-600">
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="font-medium text-indigo-600 hover:underline"
              >
                Create one
              </Link>
            </p>
            <p>
              <Link
                href="/auth/forgot-password"
                className="font-medium text-fuchsia-600 hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// If the user is already signed in, skip the form and send them home.
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerAuthSession(ctx);
  if (session) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }
  return { props: {} };
}
