import Head from "next/head";
import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import { AuthShell } from "~/components/auth/AuthShell";
import { OtpInput } from "~/components/auth/OtpInput";
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
  const [loading, setLoading] = useState(false);
  const verifyingRef = useRef(false);

  const sendOtp = api.user.sendForgotPasswordOtp.useMutation();
  const verifyOtp = api.user.verifyForgotPasswordOtp.useMutation();
  const resetPassword = api.user.resetPassword.useMutation();

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await sendOtp.mutateAsync({ email });
      setOtp("");
      setOtpSent(true);
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
      setError(null);
      setInfo(null);
      setLoading(true);

      try {
        await verifyOtp.mutateAsync({ email, otp: code });
        setOtp(code);
        setOtpVerified(true);
        setInfo("Code verified. Set your new password below.");
      } catch (err) {
        setError(
          getTrpcMutationErrorMessage(err, "Invalid or expired verification code"),
        );
      } finally {
        setLoading(false);
        verifyingRef.current = false;
      }
    },
    [email, verifyOtp],
  );

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    await submitOtp(otp);
  }

  async function handleResendOtp() {
    setError(null);
    setInfo(null);
    setOtp("");
    verifyingRef.current = false;
    try {
      await sendOtp.mutateAsync({ email });
      setInfo("A new verification code was sent to your email.");
    } catch (err) {
      setError(
        getTrpcMutationErrorMessage(
          err,
          "Could not resend the verification code. Please try again.",
        ),
      );
    }
  }

  function handleEditEmail() {
    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setInfo(null);
    setError(null);
    verifyingRef.current = false;
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

  const shellTitle = otpVerified
    ? "Set a new password"
    : otpSent
      ? "Enter the verification code"
      : "Reset your password";

  const shellSubtitle = otpVerified
    ? "Choose a strong password for your account."
    : otpSent
      ? "Check your inbox for the 6-digit code."
      : "We will email you a verification code to reset your password.";

  return (
    <>
      <Head>
        <title>Forgot password · Tasker</title>
      </Head>
      <AuthShell title={shellTitle} subtitle={shellSubtitle} compact={otpSent || otpVerified}>
        <div className="rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-2xl shadow-blue-200/60 ring-1 ring-blue-100/50 backdrop-blur-xl sm:p-5">
          {!otpSent && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="brand-input mt-1.5 h-11 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                  {error}
                </p>
              )}

              <button
                className="brand-button-primary h-11 w-full"
                disabled={sendOtp.isPending}
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
          )}

          {otpSent && !otpVerified && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-sm text-slate-600">We sent a 6-digit code to</p>
                <p className="mt-1 break-all text-sm font-black text-slate-900">{email}</p>
                <button
                  type="button"
                  onClick={handleEditEmail}
                  className="mt-2 text-sm font-bold text-blue-600 underline-offset-4 hover:underline"
                >
                  Edit email
                </button>
              </div>

              <div>
                <p id="otp-label" className="label text-center">
                  Verification code
                </p>
                <div className="mt-3">
                  <OtpInput
                    id="otp"
                    value={otp}
                    onChange={setOtp}
                    onComplete={(code) => void submitOtp(code)}
                    disabled={loading || verifyOtp.isPending}
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
                className="brand-button-primary h-11 w-full"
                disabled={loading || verifyOtp.isPending || otp.length !== 6}
              >
                {loading || verifyOtp.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Verifying...
                  </span>
                ) : (
                  "Verify code"
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

          {otpVerified && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-sm text-slate-600">Resetting password for</p>
                <p className="mt-1 break-all text-sm font-black text-slate-900">{email}</p>
              </div>

              <div>
                <label className="label" htmlFor="password">
                  New password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="brand-input h-11 pr-12 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
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
                    className="brand-input h-11 pr-12 text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
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
                className="brand-button-primary h-11 w-full"
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-slate-600">
          Back to{" "}
          <Link
            href="/auth/signin"
            className="font-bold text-purple-600 underline-offset-4 hover:underline"
          >
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
