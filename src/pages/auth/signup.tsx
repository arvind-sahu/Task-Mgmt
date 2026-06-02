import { signIn } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useRef, useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";

import { AuthShell } from "~/components/auth/AuthShell";
import { OtpInput } from "~/components/auth/OtpInput";
import { OAuthButtons } from "~/components/auth/OAuthButtons";
import { getServerAuthSession } from "~/server/auth";
import {
  getOAuthProvidersForAuthPage,
  type OAuthProviderOption,
} from "~/server/oauth";
import { api } from "~/utils/api";
import { getTrpcMutationErrorMessage } from "~/utils/trpcError";

type SignUpPageProps = {
  oauthProviders: OAuthProviderOption[];
};

export default function SignUpPage({ oauthProviders }: SignUpPageProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const verifyingRef = useRef(false);

  const sendSignupOtp = api.user.sendSignupOtp.useMutation();
  const verifySignupOtpAndRegister =
    api.user.verifySignupOtpAndRegister.useMutation();

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    setError(null);

    try {
      await sendSignupOtp.mutateAsync({ name, email, password });
      setOtp("");
      setOtpStep(true);
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
        await verifySignupOtpAndRegister.mutateAsync({
          name,
          email,
          password,
          otp: code,
        });
      } catch (err) {
        setLoading(false);
        verifyingRef.current = false;
        setError(getTrpcMutationErrorMessage(err, "Could not create account"));
        return;
      }

      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setLoading(false);
      verifyingRef.current = false;

      if (!res || res.error) {
        setError("Account created. Please sign in.");
        void router.push("/auth/signin");
        return;
      }

      void router.push("/dashboard");
    },
    [email, name, password, router, verifySignupOtpAndRegister],
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
      await sendSignupOtp.mutateAsync({ name, email, password });
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
        <title>Sign up · Tasker</title>
      </Head>
      <AuthShell
        title={otpStep ? "Enter the verification code" : "Create your account"}
        subtitle={
          otpStep
            ? "Check your inbox for the 6-digit code."
            : "Start free with email OTP or a connected account. Upgrade only when your team needs more power."
        }
        compact={otpStep}
      >
        <div className="rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-2xl shadow-blue-200/60 ring-1 ring-blue-100/50 backdrop-blur-xl sm:p-5">
          {!otpStep ? (
            <>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="label" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    className="brand-input mt-1.5 h-11 text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
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
                <div>
                  <label className="label" htmlFor="password">
                    Password (min 8 characters)
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="brand-input h-11 pr-12 text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                      autoComplete="new-password"
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

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sendSignupOtp.isPending}
                  className="brand-button-primary h-11 w-full"
                >
                  {sendSignupOtp.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Sending code...
                    </span>
                  ) : (
                    "Send verification code"
                  )}
                </button>
              </form>

              <OAuthButtons providers={oauthProviders} callbackUrl="/dashboard" />

              <p className="mt-4 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="font-bold text-purple-600 underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleVerifyAndCreate} className="space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-sm text-slate-600">We sent a 6-digit code to</p>
                <p className="mt-1 break-all text-sm font-black text-slate-900">{email}</p>
                <button
                  type="button"
                  onClick={handleEditDetails}
                  className="mt-2 text-sm font-bold text-blue-600 underline-offset-4 hover:underline"
                >
                  Edit details
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
                    disabled={loading || verifySignupOtpAndRegister.isPending}
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
                  loading ||
                  verifySignupOtpAndRegister.isPending ||
                  otp.length !== 6
                }
                className="brand-button-primary h-11 w-full"
              >
                {loading || verifySignupOtpAndRegister.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating account...
                  </span>
                ) : (
                  "Verify & create account"
                )}
              </button>

              <p className="text-center text-sm text-slate-600">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={() => void handleResendOtp()}
                  disabled={sendSignupOtp.isPending}
                  className="font-bold text-purple-600 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendSignupOtp.isPending ? "Sending..." : "Resend OTP"}
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
  return {
    props: {
      oauthProviders: getOAuthProvidersForAuthPage(),
    },
  };
}
