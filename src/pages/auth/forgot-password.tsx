import Head from "next/head";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import { getServerAuthSession } from "~/server/auth";
import { api } from "~/utils/api";

const PASSWORD_RULES =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,72}$/;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sendOtp = api.user.sendForgotPasswordOtp.useMutation();
  const verifyOtp = api.user.verifyForgotPasswordOtp.useMutation();
  const resetPassword = api.user.resetPassword.useMutation();

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      const res = await sendOtp.mutateAsync({ email });
      setOtpSent(true);
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await verifyOtp.mutateAsync({ email, otp });
      setOtpVerified(true);
      setInfo("OTP verified. Set your new password below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!PASSWORD_RULES.test(password)) {
      setError(
        "Password must be 8+ chars with one letter, one number, and one special character.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await resetPassword.mutateAsync({ email, otp, password });
      setInfo("Password reset successful. Redirecting to sign in...");
      setTimeout(() => {
        void router.push("/auth/signin");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
  }

  return (
    <>
      <Head>
        <title>Forgot password · Tasker</title>
      </Head>
      <div className="auth-bg grid min-h-screen place-items-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
              T
            </div>
            <h1 className="text-2xl font-semibold">Reset your password</h1>
            <p className="mt-1 text-sm text-slate-600">
              Verify OTP from email, then set your new password
            </p>
          </div>

          {!otpSent && (
            <form onSubmit={handleSendOtp} className="card glass-card space-y-4">
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
                />
              </div>
              <button className="btn-primary w-full" disabled={sendOtp.isPending}>
                {sendOtp.isPending ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {otpSent && !otpVerified && (
            <form onSubmit={handleVerifyOtp} className="card glass-card space-y-4">
              <div>
                <label className="label" htmlFor="otp">
                  OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  className="input mt-1 tracking-[0.25em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
              <button className="btn-primary w-full" disabled={verifyOtp.isPending}>
                {verifyOtp.isPending ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {otpVerified && (
            <form onSubmit={handleResetPassword} className="card glass-card space-y-4">
              <div>
                <label className="label" htmlFor="password">
                  New password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Minimum 8 chars, one letter, one number, one special character.
                </p>
              </div>
              <div>
                <label className="label" htmlFor="confirm-password">
                  Confirm new password
                </label>
                <div className="relative mt-1">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className="input pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <button
                className="btn-primary w-full"
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}

          {info && (
            <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
              {info}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            Back to{" "}
            <Link href="/auth/signin" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
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
