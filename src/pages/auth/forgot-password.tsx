import Head from "next/head";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import { AuthShell } from "~/components/auth/AuthShell";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/utils/api";
import { getTrpcMutationErrorMessage } from "~/utils/trpcError";

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
      setError(
        getTrpcMutationErrorMessage(
          err,
          "Could not send the verification code. Please try again.",
        ),
      );
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
      setError(getTrpcMutationErrorMessage(err, "Invalid or expired verification code"));
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
      setError(getTrpcMutationErrorMessage(err, "Failed to reset password"));
    }
  }

  return (
    <>
      <Head>
        <title>Forgot password · Tasker</title>
      </Head>
      <AuthShell
        title="Reset your password"
        subtitle="Verify the OTP from your email, then set a new secure password."
      >
          {!otpSent && (
            <form
              onSubmit={handleSendOtp}
              className="space-y-5 rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-blue-200/60 backdrop-blur-xl"
            >
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="brand-input mt-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button className="brand-button-primary w-full" disabled={sendOtp.isPending}>
                {sendOtp.isPending ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {otpSent && !otpVerified && (
            <form
              onSubmit={handleVerifyOtp}
              className="space-y-5 rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-blue-200/60 backdrop-blur-xl"
            >
              <div>
                <label className="label" htmlFor="otp">
                  OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  className="brand-input mt-2 tracking-[0.25em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
              <button className="brand-button-primary w-full" disabled={verifyOtp.isPending}>
                {verifyOtp.isPending ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {otpVerified && (
            <form
              onSubmit={handleResetPassword}
              className="space-y-5 rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-blue-200/60 backdrop-blur-xl"
            >
              <div>
                <label className="label" htmlFor="password">
                  New password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="brand-input pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
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
                    className="brand-input pr-12"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button
                className="brand-button-primary w-full"
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}

          {info && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              {info}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            Back to{" "}
            <Link href="/auth/signin" className="font-bold text-purple-600 underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
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
